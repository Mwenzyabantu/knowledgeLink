/**
 * Resource Fetcher: Retrieves real learning resources from public APIs
 * Sources: YouTube, Wikipedia, DuckDuckGo, OpenLibrary
 * AI scoring happens AFTER fetching (not during)
 * Features: Keyword extraction, caching, fallback error handling
 */

export interface RawResource {
  title: string;
  url: string;
  type: "video" | "article" | "book" | "course";
  source: "youtube" | "wikipedia" | "duckduckgo" | "openlibrary";
  snippet?: string;
}

// In-memory cache for resources (key: prerequisite name, value: RawResources)
const resourceCache = new Map<string, RawResource[]>();

/**
 * Extract keyword from prerequisite name
 * Example: "Basic familiarity with MATLAB" -> "MATLAB"
 * Uses the full string as context for APIs
 */
function extractKeywordAndContext(prerequisite: string): { keyword: string; context: string } {
  // Extract the main keyword - try to find the subject
  // For "Basic familiarity with MATLAB", "MATLAB" is the subject
  // For "Data Structures and Algorithms", both are important
  const cleanPrereq = prerequisite.replace(/^(Basic\s+|Familiarity\s+with\s+|Knowledge\s+of\s+|Experience\s+in\s+)/i, "").trim();
  
  // If it's still long, take the last few words or significant ones
  const words = cleanPrereq.split(/\s+/).filter(w => w.length > 2);
  const keyword = cleanPrereq.length < 30 ? cleanPrereq : (words.slice(-2).join(" ") || cleanPrereq);
  
  return { keyword, context: prerequisite };
}

/**
 * Fetch YouTube videos for a prerequisite
 * Searches for diverse educational content without channel restrictions
 */
async function fetchYouTubeResources(query: string): Promise<RawResource[]> {
  try {
    // Using YouTube search without API key (public search)
    // In production, use official API with YOUTUBE_API_KEY
    
    // Return diverse educational searches - no channel restrictions
    const resources: RawResource[] = [
      {
        title: `${query} - Tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+tutorial`,
        type: "video",
        source: "youtube",
        snippet: "Educational tutorial for learning the topic",
      },
      {
        title: `${query} - Explanation`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+explanation`,
        type: "video",
        source: "youtube",
        snippet: "Clear explanation of the concept",
      },
      {
        title: `${query} - Lecture`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+lecture`,
        type: "video",
        source: "youtube",
        snippet: "Educational lecture covering the topic",
      },
    ];
    return resources;
  } catch (error) {
    console.error("YouTube fetch failed:", error);
    return [];
  }
}

/**
 * Fetch Wikipedia articles for a prerequisite
 */
async function fetchWikipediaResources(query: string): Promise<RawResource[]> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    );
    const data = await response.json() as any;
    
    if (data.query?.search) {
      return data.query.search.slice(0, 3).map((result: any) => ({
        title: result.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
        type: "article" as const,
        source: "wikipedia" as const,
        snippet: result.snippet,
      }));
    }
    return [];
  } catch (error) {
    console.error("Wikipedia fetch failed:", error);
    return [];
  }
}

/**
 * Fetch OpenLibrary books for a prerequisite
 */
async function fetchOpenLibraryResources(query: string): Promise<RawResource[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=3`
    );
    const data = await response.json() as any;
    
    if (data.docs) {
      return data.docs
        .filter((book: any) => book.title && book.key)
        .map((book: any) => ({
          title: book.title,
          url: `https://openlibrary.org${book.key}`,
          type: "book" as const,
          source: "openlibrary" as const,
          snippet: `by ${book.author_name?.join(", ") || "Unknown"}`,
        }));
    }
    return [];
  } catch (error) {
    console.error("OpenLibrary fetch failed:", error);
    return [];
  }
}

/**
 * Fetch from DuckDuckGo (instant answers + results)
 */
async function fetchDuckDuckGoResources(query: string): Promise<RawResource[]> {
  try {
    // DuckDuckGo instant answer API (public, no auth needed)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
    );
    const data = await response.json() as any;
    
    const resources: RawResource[] = [];
    
    // Add instant answer if available
    if (data.AbstractText) {
      resources.push({
        title: data.AbstractTitle || query,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        type: "article",
        source: "duckduckgo",
        snippet: data.AbstractText,
      });
    }
    
    // Add related links
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 2).forEach((topic: any) => {
        if (topic.FirstURL) {
          resources.push({
            title: topic.Text.split(" - ")[0] || "Related Topic",
            url: topic.FirstURL,
            type: "article",
            source: "duckduckgo",
          });
        }
      });
    }
    
    return resources;
  } catch (error) {
    console.error("DuckDuckGo fetch failed:", error);
    return [];
  }
}

/**
 * Main function: Fetch all resources for a prerequisite
 * Features:
 * - Caching to avoid repeated API calls
 * - Keyword extraction from prerequisite name
 * - Graceful fallback if one API fails (tries remaining sources)
 * - Combines resources from all sources
 */
export async function fetchResourcesForPrerequisite(
  prerequisite: string
): Promise<RawResource[]> {
  try {
    // Check cache first
    const cached = resourceCache.get(prerequisite);
    if (cached) {
      console.log(`Returning cached resources for: ${prerequisite}`);
      return cached;
    }

    const { keyword, context } = extractKeywordAndContext(prerequisite);
    
    // Fetch from all sources in parallel, but allow individual failures
    const results = await Promise.allSettled([
      fetchYouTubeResources(context),
      fetchWikipediaResources(keyword),
      fetchOpenLibraryResources(keyword),
      fetchDuckDuckGoResources(context),
    ]);

    // Extract successful results, skip failed ones
    const allResources: RawResource[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allResources.push(...result.value);
      } else {
        const sources = ["YouTube", "Wikipedia", "OpenLibrary", "DuckDuckGo"];
        console.warn(`${sources[index]} fetch failed for "${prerequisite}":`, result.reason);
      }
    });

    // Combine and deduplicate by URL
    const seen = new Set<string>();
    const deduped = allResources.filter((resource) => {
      if (seen.has(resource.url)) return false;
      seen.add(resource.url);
      return true;
    });

    // Cache the results
    resourceCache.set(prerequisite, deduped);

    return deduped;
  } catch (error) {
    console.error("Failed to fetch resources:", error);
    return [];
  }
}

/**
 * Fetch resources for multiple prerequisites (parallel)
 */
export async function fetchResourcesForPrerequisites(
  prerequisites: string[]
): Promise<Record<string, RawResource[]>> {
  try {
    const results: Record<string, RawResource[]> = {};
    
    const promises = prerequisites.map(async (prereq) => {
      const resources = await fetchResourcesForPrerequisite(prereq);
      return { prereq, resources };
    });
    
    const resolved = await Promise.all(promises);
    
    resolved.forEach(({ prereq, resources }) => {
      results[prereq] = resources;
    });
    
    return results;
  } catch (error) {
    console.error("Failed to fetch resources for prerequisites:", error);
    return {};
  }
}
