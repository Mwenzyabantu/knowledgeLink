/**
 * Resource Fetcher: Retrieves real, specific learning resources
 *
 * Pipeline:
 * 1. Use Gemini (via Supabase edge) to generate highly specific search queries
 * 2. Use Jina AI search (s.jina.ai) to find real URLs for YouTube videos + articles
 * 3. Fetch YouTube videos via edge function (YouTube Data API v3)
 * 4. Fetch Wikipedia articles
 * 5. Score & rank via Supabase scoreResources (Groq/Gemini in edge function)
 */

export interface RawResource {
  title: string;
  url: string;
  type: "video" | "article" | "book" | "course";
  source: "youtube" | "wikipedia" | "duckduckgo" | "openlibrary" | "jina";
  snippet?: string;
  thumbnail?: string;
  channelTitle?: string;
}

const FUNCTION_BASE = "https://hzhweoiwfldtmwphdkzr.supabase.co/functions/v1";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";

// In-memory cache
const resourceCache = new Map<string, RawResource[]>();

async function callEdgeFunction(
  functionName: string,
  action: string,
  data: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${FUNCTION_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Edge function ${functionName}/${action} error: ${res.status} ${text.slice(0, 300)}`
    );
  }
  return res.json();
}

/**
 * Use Gemini (via edge function) to generate highly specific search queries.
 * Falls back to smart deterministic queries if the edge call fails.
 */
async function getSpecificSearchQueries(prerequisite: string): Promise<string[]> {
  try {
    const result = await callEdgeFunction("ai-insights", "generateResourceQueries", {
      concept: prerequisite,
    });
    if (Array.isArray(result) && result.length > 0) {
      console.log(`[ResourceFetcher] Gemini generated ${result.length} queries for: "${prerequisite}"`);
      return result as string[];
    }
  } catch (err) {
    console.warn(`[ResourceFetcher] Gemini query generation failed, using fallback:`, err);
  }

  // Smart deterministic fallback
  const clean = prerequisite
    .replace(
      /^(Basic\s+|Familiarity\s+with\s+|Knowledge\s+of\s+|Experience\s+in\s+|Introduction\s+to\s+)/i,
      ""
    )
    .trim();
  return [
    `${clean} explained step by step`,
    `${clean} tutorial with examples`,
    `${clean} deep dive lecture`,
    `how ${clean} works`,
    `${clean} beginner guide`,
  ];
}

/**
 * Use Jina AI Search (s.jina.ai) to find real, specific learning resources.
 * Jina returns structured search results including real YouTube video URLs.
 */
async function fetchJinaSearchResources(
  queries: string[],
  jinaKey?: string
): Promise<RawResource[]> {
  const results: RawResource[] = [];
  const seenUrls = new Set<string>();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Return-Format": "json",
  };
  if (jinaKey) {
    headers["Authorization"] = `Bearer ${jinaKey}`;
  }

  // Use top 3 queries to search — balance coverage vs. API usage
  for (const query of queries.slice(0, 3)) {
    try {
      const searchUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(12000) });

      if (!res.ok) {
        console.warn(`[Jina] Search failed for "${query}": ${res.status}`);
        continue;
      }

      const data = (await res.json()) as any;
      const items: any[] = data?.data || data?.results || [];

      for (const item of items.slice(0, 5)) {
        const url: string = item.url || item.link || "";
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        const title: string = item.title || item.name || url;
        const snippet: string = (item.description || item.content || item.snippet || "").slice(0, 300);

        // Classify the resource type & source
        const isYouTube = url.includes("youtube.com/watch") || url.includes("youtu.be/");
        const isYouTubeChannel = url.includes("youtube.com/@") || url.includes("youtube.com/channel") || url.includes("youtube.com/playlist");
        const isWiki = url.includes("wikipedia.org");
        const isCourse = url.includes("coursera.org") || url.includes("udemy.com") ||
          url.includes("edx.org") || url.includes("khanacademy.org") ||
          url.includes("mit.edu") || url.includes("stanford.edu") ||
          url.includes("ocw.") || url.includes("nptel.ac.in");

        if (isYouTube && !isYouTubeChannel) {
          results.push({
            title,
            url,
            type: "video",
            source: "youtube",
            snippet,
          });
        } else if (isWiki) {
          results.push({
            title,
            url,
            type: "article",
            source: "wikipedia",
            snippet,
          });
        } else if (isCourse) {
          results.push({
            title,
            url,
            type: "course",
            source: "jina",
            snippet,
          });
        } else if (!isYouTubeChannel) {
          results.push({
            title,
            url,
            type: "article",
            source: "jina",
            snippet,
          });
        }
      }
    } catch (err) {
      console.warn(`[Jina] Search error for "${query}":`, err);
    }
  }

  console.log(`[ResourceFetcher] Jina found ${results.length} resources`);
  return results;
}

/**
 * Fetch real YouTube videos via the Supabase edge function (which has YOUTUBE_API_KEY).
 * Falls back to targeted Jina-found video links if edge function doesn't support it yet.
 */
async function fetchYouTubeResources(
  queries: string[],
  jinaVideos: RawResource[]
): Promise<RawResource[]> {
  // Try the edge function first (uses YouTube Data API v3)
  try {
    const result = await callEdgeFunction("ai-insights", "fetchYouTubeVideos", {
      queries,
      maxPerQuery: 3,
    });
    const videos = result?.videos || [];
    if (videos.length > 0) {
      console.log(`[ResourceFetcher] YouTube API returned ${videos.length} real videos`);
      return videos.map(
        (v: any): RawResource => ({
          title: v.title,
          url: v.url,
          type: "video",
          source: "youtube",
          snippet: v.channelTitle
            ? `${v.channelTitle} — ${v.description || ""}`.trim()
            : v.description || "",
          thumbnail: v.thumbnail,
          channelTitle: v.channelTitle,
        })
      );
    }
  } catch (err) {
    console.warn(`[ResourceFetcher] YouTube edge fetch failed:`, err);
  }

  // If edge function didn't return videos, use Jina-found YouTube links
  const jinaYt = jinaVideos.filter((r) => r.source === "youtube");
  if (jinaYt.length > 0) {
    console.log(`[ResourceFetcher] Using ${jinaYt.length} Jina-found YouTube links`);
    return jinaYt;
  }

  // Last resort: targeted YouTube search links using specific queries
  console.log(`[ResourceFetcher] Using targeted YouTube search links`);
  return queries.slice(0, 3).map(
    (q): RawResource => ({
      title: q.charAt(0).toUpperCase() + q.slice(1),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      type: "video",
      source: "youtube",
      snippet: `YouTube search: "${q}"`,
    })
  );
}

/**
 * Fetch Wikipedia articles with specific queries
 */
async function fetchWikipediaResources(queries: string[]): Promise<RawResource[]> {
  const results: RawResource[] = [];
  const seen = new Set<string>();

  for (const query of queries.slice(0, 2)) {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=2`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = (await response.json()) as any;

      for (const item of data.query?.search || []) {
        const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(
          item.title.replace(/ /g, "_")
        )}`;
        if (seen.has(url)) continue;
        seen.add(url);
        results.push({
          title: item.title,
          url,
          type: "article",
          source: "wikipedia",
          snippet: item.snippet.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim(),
        });
      }
    } catch (err) {
      console.warn(`[ResourceFetcher] Wikipedia failed for "${query}":`, err);
    }
  }
  return results;
}

/**
 * Fetch OpenLibrary books
 */
async function fetchOpenLibraryResources(query: string): Promise<RawResource[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=2&fields=title,author_name,key,first_publish_year`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = (await response.json()) as any;
    return (data.docs || [])
      .filter((b: any) => b.title && b.key)
      .slice(0, 2)
      .map(
        (b: any): RawResource => ({
          title: b.title,
          url: `https://openlibrary.org${b.key}`,
          type: "book",
          source: "openlibrary",
          snippet: [
            b.author_name?.slice(0, 2).join(", "),
            b.first_publish_year ? `(${b.first_publish_year})` : null,
          ]
            .filter(Boolean)
            .join(" "),
        })
      );
  } catch {
    return [];
  }
}

/**
 * Main function: Fetch all resources for a prerequisite with AI specificity + Jina search.
 */
export async function fetchResourcesForPrerequisite(
  prerequisite: string
): Promise<RawResource[]> {
  const cached = resourceCache.get(prerequisite);
  if (cached) {
    console.log(`[ResourceFetcher] Cache hit for: "${prerequisite}"`);
    return cached;
  }

  console.log(`[ResourceFetcher] Fetching resources for: "${prerequisite}"`);

  const jinaKey = process.env.JINA_API_KEY || process.env.JINA_KEY || "";

  // Step 1: Generate highly specific queries via Gemini
  const queries = await getSpecificSearchQueries(prerequisite);
  console.log(`[ResourceFetcher] Queries:`, queries.slice(0, 3));

  // Step 2: Jina search + Wikipedia + OpenLibrary in parallel
  const youtubeQuery = queries[0]
    ? `site:youtube.com ${queries[0]}`
    : `site:youtube.com ${prerequisite} tutorial`;

  const [jinaGeneral, jinaYoutube, wikipedia, books] = await Promise.allSettled([
    fetchJinaSearchResources(queries, jinaKey),
    fetchJinaSearchResources([youtubeQuery], jinaKey),
    fetchWikipediaResources(queries),
    fetchOpenLibraryResources(queries[0] || prerequisite),
  ]);

  const jinaResults: RawResource[] = [
    ...(jinaGeneral.status === "fulfilled" ? jinaGeneral.value : []),
    ...(jinaYoutube.status === "fulfilled" ? jinaYoutube.value : []),
  ];

  // Step 3: Get YouTube videos (tries real API, falls back to Jina-found links)
  const youtubeResources = await fetchYouTubeResources(queries, jinaResults);

  // Step 4: Combine everything
  const allResources: RawResource[] = [
    ...youtubeResources,
    ...(wikipedia.status === "fulfilled" ? wikipedia.value : []),
    ...(books.status === "fulfilled" ? books.value : []),
    // Non-YouTube Jina results (articles, courses)
    ...jinaResults.filter((r) => r.source !== "youtube"),
  ];

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allResources.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  console.log(
    `[ResourceFetcher] Total: ${deduped.length} resources (${deduped.filter((r) => r.type === "video").length} videos, ${deduped.filter((r) => r.type === "article" || r.type === "course").length} articles/courses, ${deduped.filter((r) => r.type === "book").length} books)`
  );

  resourceCache.set(prerequisite, deduped);
  return deduped;
}

/**
 * Fetch resources for multiple prerequisites (batched)
 */
export async function fetchResourcesForPrerequisites(
  prerequisites: string[]
): Promise<Record<string, RawResource[]>> {
  const results: Record<string, RawResource[]> = {};
  const batchSize = 2;

  for (let i = 0; i < prerequisites.length; i += batchSize) {
    const batch = prerequisites.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (prereq) => ({
        prereq,
        resources: await fetchResourcesForPrerequisite(prereq),
      }))
    );
    batchResults.forEach(({ prereq, resources }) => {
      results[prereq] = resources;
    });
  }
  return results;
}
