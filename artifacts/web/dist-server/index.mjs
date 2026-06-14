import { createRequire as __crReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/supabase.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var SUPABASE_URL2, anonKey, SUPABASE_ANON_KEY, supabase;
var init_supabase = __esm({
  "server/supabase.ts"() {
    "use strict";
    SUPABASE_URL2 = "https://hzhweoiwfldtmwphdkzr.supabase.co";
    anonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";
    SUPABASE_ANON_KEY = anonKey;
    supabase = createClient2(SUPABASE_URL2, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }
});

// server/supabase-edge-functions.ts
var supabase_edge_functions_exports = {};
__export(supabase_edge_functions_exports, {
  analyzeIdeaReadiness: () => analyzeIdeaReadiness,
  analyzeKnowledgeGaps: () => analyzeKnowledgeGaps,
  chatAboutIdea: () => chatAboutIdea,
  chatForProjectPreferences: () => chatForProjectPreferences,
  convertImplementation: () => convertImplementation,
  extractValidJSON: () => extractValidJSON,
  fetchYouTubeVideos: () => fetchYouTubeVideos,
  filterOutMasteredPrerequisites: () => filterOutMasteredPrerequisites,
  generate5WH: () => generate5WH,
  generateChatResponse: () => generateChatResponse,
  generateDynamicInsights: () => generateDynamicInsights,
  generateImplementationCode: () => generateImplementationCode,
  generateImplementationPreview: () => generateImplementationPreview,
  generateInlinePrompt: () => generateInlinePrompt,
  generateOpportunityProjects: () => generateOpportunityProjects,
  generateResourceQueries: () => generateResourceQueries,
  generateTags: () => generateTags,
  generateTrendContent: () => generateTrendContent,
  regenerateFlowDiagram: () => regenerateFlowDiagram,
  scoreResources: () => scoreResources,
  selectBestProjectTemplate: () => selectBestProjectTemplate,
  suggestToolAlternatives: () => suggestToolAlternatives,
  validateAIServices: () => validateAIServices,
  validateCustomTool: () => validateCustomTool
});
function getAnonKey() {
  return process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
}
async function callEdge(fn, action, data = {}) {
  const res = await fetch(`${SUPABASE_URL3}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAnonKey()}`
    },
    body: JSON.stringify({ action, ...data })
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Edge function ${fn}/${action} failed: ${res.status} ${text2.slice(0, 300)}`);
  }
  return res.json();
}
async function generate5WH(input) {
  return callEdge("ai-generate", "generate5WH", { input });
}
async function generateImplementationPreview(concept, conversationHistory = [], userConcepts = [], learnerProfile = "") {
  return callEdge("ai-generate", "generateImplementationPreview", {
    concept,
    conversationHistory,
    userConcepts,
    learnerProfile
  });
}
async function generateImplementationCode(concept, projectType, tool, language, template) {
  return callEdge("ai-generate", "generateImplementationCode", {
    concept,
    projectType,
    tool,
    language,
    template
  });
}
async function generateInlinePrompt(userInput, previousPrompts = [], recentTyping) {
  const chatHistory = [
    ...previousPrompts.map((p) => ({ role: "user", content: p })),
    ...recentTyping ? [{ role: "user", content: recentTyping }] : []
  ];
  return callEdge("ai-generate", "generateInlinePrompt", {
    concept: userInput,
    chatHistory
  });
}
async function generateChatResponse(userMessage, conversationHistory, conceptContext) {
  const result = await callEdge("ai-chat", "generateChatResponse", {
    lastMessage: userMessage,
    chatHistory: conversationHistory,
    concept: conceptContext
  });
  return result?.response ?? result;
}
async function generateTags(conversationContent) {
  const result = await callEdge("ai-chat", "generateTags", {
    content: conversationContent
  });
  return Array.isArray(result) ? result : result?.tags ?? [];
}
async function chatForProjectPreferences(conversationHistory, userMessage) {
  return callEdge("ai-chat", "chatForProjectPreferences", {
    conversation: conversationHistory,
    lastMessage: userMessage
  });
}
async function chatAboutIdea(ideaSummary, conversationHistory, userMessage) {
  return callEdge("ai-chat", "chatAboutIdea", {
    ideaSummary,
    conversation: conversationHistory,
    lastMessage: userMessage
  });
}
async function analyzeIdeaReadiness(idea, conversationHistory) {
  return callEdge("ai-chat", "analyzeIdeaReadiness", {
    idea,
    conversation: conversationHistory
  });
}
async function generateTrendContent(conceptTitles, category, recent) {
  return callEdge("ai-insights", "generateTrendContent", {
    conceptTitles,
    category,
    recent
  });
}
async function generateOpportunityProjects(concepts2, userLocation, userGoals, userIdeas) {
  return callEdge("ai-insights", "generateOpportunityProjects", {
    concepts: concepts2,
    location: userLocation,
    careerGoals: userGoals,
    ideaTitles: userIdeas
  });
}
async function analyzeKnowledgeGaps(concepts2, completedProjects) {
  return callEdge("ai-insights", "analyzeKnowledgeGaps", {
    concepts: concepts2,
    completedProjects
  });
}
async function generateDynamicInsights(concepts2, projects, personalization, feedback) {
  return callEdge("ai-insights", "generateDynamicInsights", {
    concepts: concepts2,
    projects,
    personalization,
    feedback: feedback || []
  });
}
async function suggestToolAlternatives(tool, projectType, language) {
  return callEdge("ai-insights", "suggestToolAlternatives", {
    tool,
    projectType: projectType || "general",
    language
  });
}
async function filterOutMasteredPrerequisites(newPrerequisites, masteredSkills) {
  return callEdge("ai-insights", "filterOutMasteredPrerequisites", {
    newPrerequisites,
    masteredSkills
  });
}
async function selectBestProjectTemplate(candidates, targetType, targetTool, targetLanguage) {
  return callEdge("ai-insights", "selectBestProjectTemplate", {
    candidates,
    targetType,
    targetTool,
    targetLanguage
  });
}
async function convertImplementation(implementation, targetType, targetTool, targetLanguage) {
  return callEdge("ai-insights", "convertImplementation", {
    code: implementation?.code || "",
    fromTool: implementation?.tool || "",
    fromLanguage: implementation?.language || "",
    toTool: targetTool || targetLanguage || "",
    toLanguage: targetLanguage || targetTool || ""
  });
}
async function validateCustomTool(tool, language, projectType) {
  return callEdge("ai-insights", "validateCustomTool", {
    tool,
    language,
    projectType
  });
}
async function regenerateFlowDiagram(implementation) {
  return callEdge("ai-insights", "regenerateFlowDiagram", { implementation });
}
async function scoreResources(resources2, concept) {
  return callEdge("ai-insights", "scoreResources", { resources: resources2, concept });
}
async function generateResourceQueries(concept, category, context) {
  const result = await callEdge("ai-insights", "generateResourceQueries", {
    concept,
    category: category || "",
    context: context || ""
  });
  return Array.isArray(result) ? result : result?.queries ?? [];
}
async function fetchYouTubeVideos(queries, maxPerQuery = 3) {
  const result = await callEdge("ai-insights", "fetchYouTubeVideos", {
    queries,
    maxPerQuery
  });
  return result?.videos ?? (Array.isArray(result) ? result : []);
}
function extractValidJSON(text2) {
  text2 = text2.trim();
  const startIdx = text2.indexOf("{");
  if (startIdx === -1) throw new Error("No JSON object found in response");
  let braceCount = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  for (let i = startIdx; i < text2.length; i++) {
    const char = text2[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1) throw new Error("No complete JSON object found in response");
  return JSON.parse(text2.slice(startIdx, endIdx + 1));
}
function validateAIServices() {
  const anonKey2 = getAnonKey();
  if (anonKey2) {
    console.log("\u2713 Supabase Edge Functions: connected (all AI calls routed through Supabase)");
  } else {
    console.warn("\u26A0\uFE0F  Supabase anon key not found \u2014 AI calls will fail.");
  }
}
var SUPABASE_URL3;
var init_supabase_edge_functions = __esm({
  "server/supabase-edge-functions.ts"() {
    "use strict";
    init_supabase();
    SUPABASE_URL3 = "https://hzhweoiwfldtmwphdkzr.supabase.co/functions/v1";
  }
});

// server/resource-fetcher.ts
var resource_fetcher_exports = {};
__export(resource_fetcher_exports, {
  fetchResourcesForPrerequisite: () => fetchResourcesForPrerequisite,
  fetchResourcesForPrerequisites: () => fetchResourcesForPrerequisites
});
async function callEdgeFunction(functionName, action, data) {
  const res = await fetch(`${FUNCTION_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ action, ...data })
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(
      `Edge function ${functionName}/${action} error: ${res.status} ${text2.slice(0, 300)}`
    );
  }
  return res.json();
}
async function getSpecificSearchQueries(prerequisite) {
  try {
    const result = await callEdgeFunction("ai-insights", "generateResourceQueries", {
      concept: prerequisite
    });
    if (Array.isArray(result) && result.length > 0) {
      console.log(`[ResourceFetcher] Gemini generated ${result.length} queries for: "${prerequisite}"`);
      return result;
    }
  } catch (err) {
    console.warn(`[ResourceFetcher] Gemini query generation failed, using fallback:`, err);
  }
  const clean = prerequisite.replace(
    /^(Basic\s+|Familiarity\s+with\s+|Knowledge\s+of\s+|Experience\s+in\s+|Introduction\s+to\s+)/i,
    ""
  ).trim();
  return [
    `${clean} explained step by step`,
    `${clean} tutorial with examples`,
    `${clean} deep dive lecture`,
    `how ${clean} works`,
    `${clean} beginner guide`
  ];
}
async function fetchJinaSearchResources(queries, jinaKey) {
  const results = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const headers = {
    Accept: "application/json",
    "X-Return-Format": "json"
  };
  if (jinaKey) {
    headers["Authorization"] = `Bearer ${jinaKey}`;
  }
  for (const query of queries.slice(0, 3)) {
    try {
      const searchUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(12e3) });
      if (!res.ok) {
        console.warn(`[Jina] Search failed for "${query}": ${res.status}`);
        continue;
      }
      const data = await res.json();
      const items = data?.data || data?.results || [];
      for (const item of items.slice(0, 5)) {
        const url = item.url || item.link || "";
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        const title = item.title || item.name || url;
        const snippet = (item.description || item.content || item.snippet || "").slice(0, 300);
        const isYouTube = url.includes("youtube.com/watch") || url.includes("youtu.be/");
        const isYouTubeChannel = url.includes("youtube.com/@") || url.includes("youtube.com/channel") || url.includes("youtube.com/playlist");
        const isWiki = url.includes("wikipedia.org");
        const isCourse = url.includes("coursera.org") || url.includes("udemy.com") || url.includes("edx.org") || url.includes("khanacademy.org") || url.includes("mit.edu") || url.includes("stanford.edu") || url.includes("ocw.") || url.includes("nptel.ac.in");
        if (isYouTube && !isYouTubeChannel) {
          results.push({
            title,
            url,
            type: "video",
            source: "youtube",
            snippet
          });
        } else if (isWiki) {
          results.push({
            title,
            url,
            type: "article",
            source: "wikipedia",
            snippet
          });
        } else if (isCourse) {
          results.push({
            title,
            url,
            type: "course",
            source: "jina",
            snippet
          });
        } else if (!isYouTubeChannel) {
          results.push({
            title,
            url,
            type: "article",
            source: "jina",
            snippet
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
async function fetchYouTubeResources(queries, jinaVideos) {
  try {
    const result = await callEdgeFunction("ai-insights", "fetchYouTubeVideos", {
      queries,
      maxPerQuery: 3
    });
    const videos = result?.videos || [];
    if (videos.length > 0) {
      console.log(`[ResourceFetcher] YouTube API returned ${videos.length} real videos`);
      return videos.map(
        (v) => ({
          title: v.title,
          url: v.url,
          type: "video",
          source: "youtube",
          snippet: v.channelTitle ? `${v.channelTitle} \u2014 ${v.description || ""}`.trim() : v.description || "",
          thumbnail: v.thumbnail,
          channelTitle: v.channelTitle
        })
      );
    }
  } catch (err) {
    console.warn(`[ResourceFetcher] YouTube edge fetch failed:`, err);
  }
  const jinaYt = jinaVideos.filter((r) => r.source === "youtube");
  if (jinaYt.length > 0) {
    console.log(`[ResourceFetcher] Using ${jinaYt.length} Jina-found YouTube links`);
    return jinaYt;
  }
  console.log(`[ResourceFetcher] Using targeted YouTube search links`);
  return queries.slice(0, 3).map(
    (q) => ({
      title: q.charAt(0).toUpperCase() + q.slice(1),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      type: "video",
      source: "youtube",
      snippet: `YouTube search: "${q}"`
    })
  );
}
async function fetchWikipediaResources(queries) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const query of queries.slice(0, 2)) {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=2`,
        { signal: AbortSignal.timeout(8e3) }
      );
      const data = await response.json();
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
          snippet: item.snippet.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim()
        });
      }
    } catch (err) {
      console.warn(`[ResourceFetcher] Wikipedia failed for "${query}":`, err);
    }
  }
  return results;
}
async function fetchOpenLibraryResources(query) {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=2&fields=title,author_name,key,first_publish_year`,
      { signal: AbortSignal.timeout(8e3) }
    );
    const data = await response.json();
    return (data.docs || []).filter((b) => b.title && b.key).slice(0, 2).map(
      (b) => ({
        title: b.title,
        url: `https://openlibrary.org${b.key}`,
        type: "book",
        source: "openlibrary",
        snippet: [
          b.author_name?.slice(0, 2).join(", "),
          b.first_publish_year ? `(${b.first_publish_year})` : null
        ].filter(Boolean).join(" ")
      })
    );
  } catch {
    return [];
  }
}
async function fetchResourcesForPrerequisite(prerequisite) {
  const cached = resourceCache.get(prerequisite);
  if (cached) {
    console.log(`[ResourceFetcher] Cache hit for: "${prerequisite}"`);
    return cached;
  }
  console.log(`[ResourceFetcher] Fetching resources for: "${prerequisite}"`);
  const jinaKey = process.env.JINA_API_KEY || process.env.JINA_KEY || "";
  const queries = await getSpecificSearchQueries(prerequisite);
  console.log(`[ResourceFetcher] Queries:`, queries.slice(0, 3));
  const youtubeQuery = queries[0] ? `site:youtube.com ${queries[0]}` : `site:youtube.com ${prerequisite} tutorial`;
  const [jinaGeneral, jinaYoutube, wikipedia, books] = await Promise.allSettled([
    fetchJinaSearchResources(queries, jinaKey),
    fetchJinaSearchResources([youtubeQuery], jinaKey),
    fetchWikipediaResources(queries),
    fetchOpenLibraryResources(queries[0] || prerequisite)
  ]);
  const jinaResults = [
    ...jinaGeneral.status === "fulfilled" ? jinaGeneral.value : [],
    ...jinaYoutube.status === "fulfilled" ? jinaYoutube.value : []
  ];
  const youtubeResources = await fetchYouTubeResources(queries, jinaResults);
  const allResources = [
    ...youtubeResources,
    ...wikipedia.status === "fulfilled" ? wikipedia.value : [],
    ...books.status === "fulfilled" ? books.value : [],
    // Non-YouTube Jina results (articles, courses)
    ...jinaResults.filter((r) => r.source !== "youtube")
  ];
  const seen = /* @__PURE__ */ new Set();
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
async function fetchResourcesForPrerequisites(prerequisites) {
  const results = {};
  const batchSize = 2;
  for (let i = 0; i < prerequisites.length; i += batchSize) {
    const batch = prerequisites.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (prereq) => ({
        prereq,
        resources: await fetchResourcesForPrerequisite(prereq)
      }))
    );
    batchResults.forEach(({ prereq, resources: resources2 }) => {
      results[prereq] = resources2;
    });
  }
  return results;
}
var FUNCTION_BASE, ANON_KEY, resourceCache;
var init_resource_fetcher = __esm({
  "server/resource-fetcher.ts"() {
    "use strict";
    FUNCTION_BASE = "https://hzhweoiwfldtmwphdkzr.supabase.co/functions/v1";
    ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";
    resourceCache = /* @__PURE__ */ new Map();
  }
});

// server/sse-generator.ts
var sse_generator_exports = {};
__export(sse_generator_exports, {
  cleanupSSEClient: () => cleanupSSEClient,
  isGenerationCanceled: () => isGenerationCanceled,
  registerSSEClient: () => registerSSEClient,
  sendCompleted: () => sendCompleted,
  sendError: () => sendError,
  sendProgressDetail: () => sendProgressDetail,
  sendSSEEvent: () => sendSSEEvent,
  sendStageComplete: () => sendStageComplete,
  sendStageStart: () => sendStageStart
});
function registerSSEClient(generationId, res) {
  SSE_CLIENTS.set(generationId, res);
  CANCELED_GENERATIONS.delete(generationId);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  sendSSEEvent(generationId, "connected", { message: "SSE stream connected" });
  const bufferedEvents = EVENT_BUFFER.get(generationId);
  if (bufferedEvents && bufferedEvents.length > 0) {
    console.log(`[SSE] Flushing ${bufferedEvents.length} buffered events for ${generationId}`);
    for (const bufferedEvent of bufferedEvents) {
      sendSSEEvent(generationId, bufferedEvent.event, bufferedEvent.payload);
    }
    EVENT_BUFFER.delete(generationId);
  }
  res.on("close", () => {
    SSE_CLIENTS.delete(generationId);
    CANCELED_GENERATIONS.add(generationId);
    console.log(`[SSE] Client disconnected for ${generationId}, marked as canceled`);
  });
}
function isGenerationCanceled(generationId) {
  return CANCELED_GENERATIONS.has(generationId);
}
function sendSSEEvent(generationId, event, payload) {
  const res = SSE_CLIENTS.get(generationId);
  if (!res || res.destroyed) {
    if (!res) {
      const buffer = EVENT_BUFFER.get(generationId) || [];
      if (buffer.length < MAX_BUFFER_SIZE) {
        buffer.push({ event, payload });
        EVENT_BUFFER.set(generationId, buffer);
        console.log(`[SSE] Buffered event ${event} for ${generationId} (${buffer.length}/${MAX_BUFFER_SIZE})`);
      }
    }
    return;
  }
  try {
    res.write(`event: ${event}
`);
    res.write(`data: ${JSON.stringify(payload)}

`);
    console.log(`[SSE] Sent ${event} to ${generationId}`);
  } catch (err) {
    console.error(`[SSE] Failed to send event to ${generationId}:`, err);
    SSE_CLIENTS.delete(generationId);
  }
}
function sendCompleted(generationId, payload = {}) {
  sendSSEEvent(generationId, "completed", {
    message: "Generation complete",
    ...payload
  });
}
function cleanupSSEClient(generationId) {
  const res = SSE_CLIENTS.get(generationId);
  if (res && !res.destroyed) {
    res.end();
  }
  SSE_CLIENTS.delete(generationId);
}
function sendStageStart(generationId, stage, message) {
  sendSSEEvent(generationId, "stage_start", { stage, message });
}
function sendStageComplete(generationId, stage, message) {
  sendSSEEvent(generationId, "stage_complete", { stage, message });
}
function sendProgressDetail(generationId, detail) {
  sendSSEEvent(generationId, "detail", { detail });
}
function sendError(generationId, error) {
  sendSSEEvent(generationId, "error", { error });
}
var SSE_CLIENTS, EVENT_BUFFER, MAX_BUFFER_SIZE, CANCELED_GENERATIONS;
var init_sse_generator = __esm({
  "server/sse-generator.ts"() {
    "use strict";
    SSE_CLIENTS = /* @__PURE__ */ new Map();
    EVENT_BUFFER = /* @__PURE__ */ new Map();
    MAX_BUFFER_SIZE = 50;
    CANCELED_GENERATIONS = /* @__PURE__ */ new Set();
  }
});

// server/index.ts
import express2 from "express";

// server/db.ts
import { createClient } from "@supabase/supabase-js";
var SUPABASE_URL = "https://hzhweoiwfldtmwphdkzr.supabase.co";
var serviceKey = process.env.SUPABSE_ACCESS_TOKEN;
if (!serviceKey) {
  throw new Error(
    "SUPABSE_ACCESS_TOKEN must be set (Supabase service role key)"
  );
}
var supabaseAdmin = createClient(SUPABASE_URL, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url ?? null,
    createdAt: new Date(row.created_at)
  };
}
function toConcept(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    originalInput: row.original_input ?? null,
    title: row.title,
    category: row.category,
    problem: row.problem,
    what: row.what,
    why: row.why,
    how: row.how,
    where: row.where_applications ?? [],
    who: row.who,
    when: row.when_context,
    pseudocode: row.pseudocode ?? null,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite ?? false,
    prerequisites: row.prerequisites ?? { essential: [], helpful: [], optional: [] },
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at)
  };
}
function toChatSession(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    type: row.type,
    conceptId: row.concept_id ?? null,
    projectId: row.project_id ?? null,
    tags: row.tags ?? [],
    isCollapsed: row.is_collapsed ?? false,
    createdAt: new Date(row.created_at),
    lastMessageAt: new Date(row.last_message_at)
  };
}
function toChatMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id ?? null,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at)
  };
}
function toTrend(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url ?? null,
    imageDescription: row.image_description ?? null,
    source: row.source,
    sourceUrl: row.source_url ?? null,
    relevanceToUser: row.relevance_to_user,
    relatedConcepts: row.related_concepts ?? [],
    category: row.category,
    publishedAt: new Date(row.published_at),
    readByUser: row.read_by_user ?? false,
    userRating: row.user_rating ?? null
  };
}
function toImplementation(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id,
    chatHistoryId: row.chat_history_id ?? null,
    projectName: row.project_name,
    type: row.type,
    tool: row.tool,
    language: row.language,
    imageUrl: row.image_url ?? null,
    components: row.components ?? [],
    learningGoals: row.learning_goals ?? [],
    expectedOutcomes: row.expected_outcomes ?? [],
    requiredArtifacts: row.required_artifacts ?? [],
    problemAddressed: row.problem_addressed ?? null,
    whySuggested: row.why_suggested ?? null,
    realWorldContext: row.real_world_context ?? null,
    industry: row.industry ?? null,
    code: row.code ?? null,
    pseudocode: row.pseudocode ?? null,
    flowDiagram: row.flow_diagram ?? null,
    instructions: row.instructions ?? null,
    status: row.status,
    version: row.version,
    previousVersionId: row.previous_version_id ?? null,
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at)
  };
}
function toProjectFeedback(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    implementationId: row.implementation_id,
    difficultyRating: row.difficulty_rating,
    enjoymentRating: row.enjoyment_rating,
    metObjectives: row.met_objectives ?? [],
    learntSkills: row.learnt_skills ?? [],
    outcomeMatches: row.outcome_matches ?? true,
    feedbackText: row.feedback_text ?? null,
    completedAt: new Date(row.completed_at)
  };
}
function toOpportunityProject(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty,
    estimatedHours: row.estimated_hours,
    skills: row.skills ?? [],
    relatedConceptIds: row.related_concept_ids ?? [],
    recommendedImplementationId: row.recommended_implementation_id ?? null,
    locationContext: row.location_context ?? null,
    problemType: row.problem_type ?? "everyday",
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at)
  };
}
function toProjectInteraction(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    projectId: row.project_id,
    action: row.action,
    createdAt: new Date(row.created_at)
  };
}
function toGenerationTracking(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    lastDailyGeneration: row.last_daily_generation ? new Date(row.last_daily_generation) : null,
    conceptCountSinceLastGeneration: row.concept_count_since_last_generation,
    updatedAt: new Date(row.updated_at)
  };
}
function toLearnerProfile(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    profile: row.profile,
    conceptsIncluded: row.concepts_included ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}
function toUserClaimedKnowledge(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id,
    source: row.source,
    proficiencyLevel: row.proficiency_level,
    claimedAt: new Date(row.claimed_at)
  };
}
function toResource(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id ?? null,
    projectId: row.project_id ?? null,
    title: row.title,
    url: row.url,
    type: row.type,
    source: row.source,
    description: row.description ?? null,
    relevanceScore: row.relevance_score ?? 50,
    prerequisite: row.prerequisite ?? null,
    fetchedAt: new Date(row.fetched_at)
  };
}
function toUserSettings(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    enableConceptCountGeneration: row.enable_concept_count_generation,
    enableDailyGeneration: row.enable_daily_generation,
    conceptCountThreshold: row.concept_count_threshold,
    dailyGenerationFrequencyDays: row.daily_generation_frequency_days,
    updatedAt: new Date(row.updated_at)
  };
}
function toUserMasteredPrerequisites(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    implementationId: row.implementation_id,
    prerequisite: row.prerequisite,
    masteredAt: new Date(row.mastered_at)
  };
}
function toUserPersonalization(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    careerGoals: row.career_goals ?? [],
    currentCareer: row.current_career ?? null,
    aspiringCareer: row.aspiring_career ?? null,
    desiredRole: row.desired_role ?? null,
    targetIndustry: row.target_industry ?? null,
    yearsOfExperience: row.years_of_experience ?? null,
    skillsFocus: row.skills_focus ?? [],
    preferredVoice: row.preferred_voice ?? "",
    theme: row.theme ?? "system",
    location: row.location ?? null,
    locationLastUpdated: row.location_last_updated ? new Date(row.location_last_updated) : null,
    projectPreferences: row.project_preferences ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}
function toIdeaSession(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    messages: row.messages ?? [],
    ideaSummary: row.idea_summary ?? null,
    analysis: row.analysis ?? null,
    status: row.status,
    projectId: row.project_id ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}
var DbStorage = class {
  sessionStore;
  constructor() {
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({ checkPeriod: 864e5 });
  }
  // ── Users ───────────────────────────────────────────────────
  async getUser(id) {
    try {
      const { data } = await supabaseAdmin.from("profiles").select().eq("id", id).maybeSingle();
      return data ? toUser(data) : void 0;
    } catch {
      return void 0;
    }
  }
  async getUserByUsername(username) {
    try {
      const { data } = await supabaseAdmin.from("profiles").select().eq("username", username).maybeSingle();
      return data ? toUser(data) : void 0;
    } catch {
      return void 0;
    }
  }
  async getUserByEmail(email) {
    try {
      const { data } = await supabaseAdmin.from("profiles").select().eq("email", email).maybeSingle();
      return data ? toUser(data) : void 0;
    } catch {
      return void 0;
    }
  }
  async createUser(insertUser) {
    const { data, error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: insertUser.id,
        username: insertUser.username,
        email: insertUser.email,
        avatar_url: insertUser.avatarUrl ?? null
      },
      { onConflict: "id" }
    ).select().single();
    if (error) throw new Error(error.message);
    return toUser(data);
  }
  async deleteUser(id) {
    const tables = [
      "opportunity_projects",
      "trends",
      "user_settings",
      "user_personalization",
      "generation_tracking",
      "learner_profiles",
      "user_claimed_knowledge",
      "user_mastered_prerequisites",
      "project_feedback",
      "project_interactions",
      "resources",
      "chat_messages",
      "chat_sessions",
      "idea_sessions",
      "implementations",
      "concepts"
    ];
    for (const table of tables) {
      await supabaseAdmin.from(table).delete().eq("user_id", id);
    }
    const { error } = await supabaseAdmin.from("profiles").delete().eq("id", id);
    await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {
    });
    return !error;
  }
  // ── Concepts ────────────────────────────────────────────────
  async getConcepts(userId) {
    try {
      let query = supabaseAdmin.from("concepts").select().order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      return (data ?? []).map(toConcept);
    } catch {
      return [];
    }
  }
  async getConceptById(id) {
    const { data } = await supabaseAdmin.from("concepts").select().eq("id", id).maybeSingle();
    return data ? toConcept(data) : void 0;
  }
  async createConcept(concept) {
    const { data, error } = await supabaseAdmin.from("concepts").insert({
      user_id: concept.userId ?? null,
      original_input: concept.originalInput ?? null,
      title: concept.title,
      category: concept.category,
      problem: concept.problem,
      what: concept.what,
      why: concept.why,
      how: concept.how,
      where_applications: concept.where ?? [],
      who: concept.who,
      when_context: concept.when,
      pseudocode: concept.pseudocode ?? null,
      tags: concept.tags ?? [],
      is_favorite: concept.isFavorite ?? false,
      prerequisites: concept.prerequisites ?? {
        essential: [],
        helpful: [],
        optional: []
      }
    }).select().single();
    if (error) throw new Error(error.message);
    return toConcept(data);
  }
  async updateConcept(id, updates) {
    const dbUpdates = {};
    if (updates.originalInput !== void 0)
      dbUpdates.original_input = updates.originalInput;
    if (updates.title !== void 0) dbUpdates.title = updates.title;
    if (updates.category !== void 0) dbUpdates.category = updates.category;
    if (updates.problem !== void 0) dbUpdates.problem = updates.problem;
    if (updates.what !== void 0) dbUpdates.what = updates.what;
    if (updates.why !== void 0) dbUpdates.why = updates.why;
    if (updates.how !== void 0) dbUpdates.how = updates.how;
    if (updates.where !== void 0)
      dbUpdates.where_applications = updates.where;
    if (updates.who !== void 0) dbUpdates.who = updates.who;
    if (updates.when !== void 0) dbUpdates.when_context = updates.when;
    if (updates.pseudocode !== void 0)
      dbUpdates.pseudocode = updates.pseudocode;
    if (updates.tags !== void 0) dbUpdates.tags = updates.tags;
    if (updates.isFavorite !== void 0)
      dbUpdates.is_favorite = updates.isFavorite;
    if (updates.prerequisites !== void 0)
      dbUpdates.prerequisites = updates.prerequisites;
    if (updates.lastAccessedAt !== void 0)
      dbUpdates.last_accessed_at = updates.lastAccessedAt;
    const { data } = await supabaseAdmin.from("concepts").update(dbUpdates).eq("id", id).select().single();
    return data ? toConcept(data) : void 0;
  }
  async deleteConcept(id) {
    const { error } = await supabaseAdmin.from("concepts").delete().eq("id", id);
    return !error;
  }
  // ── Chat Sessions ────────────────────────────────────────────
  async getChatSessions(userId) {
    let query = supabaseAdmin.from("chat_sessions").select().order("last_message_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toChatSession);
  }
  async getChatSessionById(id, userId) {
    let query = supabaseAdmin.from("chat_sessions").select().eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toChatSession(data) : void 0;
  }
  async getChatSessionByConceptId(conceptId) {
    const { data } = await supabaseAdmin.from("chat_sessions").select().eq("concept_id", conceptId).maybeSingle();
    return data ? toChatSession(data) : void 0;
  }
  async getChatSessionByProjectId(projectId) {
    const { data } = await supabaseAdmin.from("chat_sessions").select().eq("project_id", projectId).maybeSingle();
    return data ? toChatSession(data) : void 0;
  }
  async createChatSession(insertSession) {
    const { data, error } = await supabaseAdmin.from("chat_sessions").insert({
      user_id: insertSession.userId ?? null,
      type: insertSession.type,
      concept_id: insertSession.conceptId ?? null,
      project_id: insertSession.projectId ?? null,
      tags: insertSession.tags ?? [],
      is_collapsed: insertSession.isCollapsed ?? false
    }).select().single();
    if (error) throw new Error(error.message);
    return toChatSession(data);
  }
  async updateChatSession(id, updates) {
    const dbUpdates = {
      last_message_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.type !== void 0) dbUpdates.type = updates.type;
    if (updates.conceptId !== void 0)
      dbUpdates.concept_id = updates.conceptId;
    if (updates.projectId !== void 0)
      dbUpdates.project_id = updates.projectId;
    if (updates.tags !== void 0) dbUpdates.tags = updates.tags;
    if (updates.isCollapsed !== void 0)
      dbUpdates.is_collapsed = updates.isCollapsed;
    const { data } = await supabaseAdmin.from("chat_sessions").update(dbUpdates).eq("id", id).select().single();
    return data ? toChatSession(data) : void 0;
  }
  async deleteChatSession(id) {
    const { error } = await supabaseAdmin.from("chat_sessions").delete().eq("id", id);
    return !error;
  }
  // ── Chat Messages ────────────────────────────────────────────
  async getChatMessagesBySessionId(sessionId) {
    const { data } = await supabaseAdmin.from("chat_messages").select().eq("session_id", sessionId).order("created_at", { ascending: true });
    return (data ?? []).map(toChatMessage);
  }
  async createChatMessage(insertMessage) {
    const { data, error } = await supabaseAdmin.from("chat_messages").insert({
      session_id: insertMessage.sessionId,
      user_id: insertMessage.userId ?? null,
      role: insertMessage.role,
      content: insertMessage.content
    }).select().single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("chat_sessions").update({ last_message_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", insertMessage.sessionId);
    return toChatMessage(data);
  }
  // ── Implementations ──────────────────────────────────────────
  async getImplementations(userId) {
    try {
      let query = supabaseAdmin.from("implementations").select().order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      return (data ?? []).map(toImplementation);
    } catch {
      return [];
    }
  }
  async getImplementationById(id, userId) {
    let query = supabaseAdmin.from("implementations").select().eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toImplementation(data) : void 0;
  }
  async getImplementationsByConceptId(conceptId) {
    const { data } = await supabaseAdmin.from("implementations").select().eq("concept_id", conceptId).order("created_at", { ascending: false });
    return (data ?? []).map(toImplementation);
  }
  async getSimilarImplementations(type, tool, language, limit = 3) {
    const { data } = await supabaseAdmin.from("implementations").select().order("created_at", { ascending: false });
    const all = (data ?? []).map(toImplementation);
    const withInstructions = all.filter(
      (impl) => impl.instructions && impl.instructions.trim().length > 0
    );
    const scored = withInstructions.map((impl) => {
      let score = 0;
      if (impl.type?.toLowerCase() === type.toLowerCase()) score += 3;
      if (impl.tool?.toLowerCase() === tool.toLowerCase()) score += 2;
      if (impl.language?.toLowerCase() === language.toLowerCase()) score += 2;
      return { impl, score };
    });
    return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.impl);
  }
  async createImplementation(insertImpl) {
    const { data, error } = await supabaseAdmin.from("implementations").insert({
      user_id: insertImpl.userId ?? null,
      concept_id: insertImpl.conceptId,
      chat_history_id: insertImpl.chatHistoryId ?? null,
      project_name: insertImpl.projectName,
      type: insertImpl.type,
      tool: insertImpl.tool,
      language: insertImpl.language,
      image_url: insertImpl.imageUrl ?? null,
      components: insertImpl.components ?? [],
      learning_goals: insertImpl.learningGoals ?? [],
      expected_outcomes: insertImpl.expectedOutcomes ?? [],
      required_artifacts: insertImpl.requiredArtifacts ?? [],
      problem_addressed: insertImpl.problemAddressed ?? null,
      why_suggested: insertImpl.whySuggested ?? null,
      real_world_context: insertImpl.realWorldContext ?? null,
      industry: insertImpl.industry ?? null,
      code: insertImpl.code ?? null,
      pseudocode: insertImpl.pseudocode ?? null,
      flow_diagram: insertImpl.flowDiagram ?? null,
      instructions: insertImpl.instructions ?? null,
      status: insertImpl.status ?? "preview",
      version: insertImpl.version ?? 1,
      previous_version_id: insertImpl.previousVersionId ?? null
    }).select().single();
    if (error) throw new Error(error.message);
    return toImplementation(data);
  }
  async updateImplementation(id, updates) {
    const dbUpdates = {};
    if (updates.projectName !== void 0)
      dbUpdates.project_name = updates.projectName;
    if (updates.type !== void 0) dbUpdates.type = updates.type;
    if (updates.tool !== void 0) dbUpdates.tool = updates.tool;
    if (updates.language !== void 0) dbUpdates.language = updates.language;
    if (updates.imageUrl !== void 0) dbUpdates.image_url = updates.imageUrl;
    if (updates.components !== void 0)
      dbUpdates.components = updates.components;
    if (updates.learningGoals !== void 0)
      dbUpdates.learning_goals = updates.learningGoals;
    if (updates.expectedOutcomes !== void 0)
      dbUpdates.expected_outcomes = updates.expectedOutcomes;
    if (updates.requiredArtifacts !== void 0)
      dbUpdates.required_artifacts = updates.requiredArtifacts;
    if (updates.problemAddressed !== void 0)
      dbUpdates.problem_addressed = updates.problemAddressed;
    if (updates.whySuggested !== void 0)
      dbUpdates.why_suggested = updates.whySuggested;
    if (updates.realWorldContext !== void 0)
      dbUpdates.real_world_context = updates.realWorldContext;
    if (updates.industry !== void 0) dbUpdates.industry = updates.industry;
    if (updates.code !== void 0) dbUpdates.code = updates.code;
    if (updates.pseudocode !== void 0)
      dbUpdates.pseudocode = updates.pseudocode;
    if (updates.flowDiagram !== void 0)
      dbUpdates.flow_diagram = updates.flowDiagram;
    if (updates.instructions !== void 0)
      dbUpdates.instructions = updates.instructions;
    if (updates.status !== void 0) dbUpdates.status = updates.status;
    if (updates.version !== void 0) dbUpdates.version = updates.version;
    if (updates.previousVersionId !== void 0)
      dbUpdates.previous_version_id = updates.previousVersionId;
    if (updates.lastAccessedAt !== void 0)
      dbUpdates.last_accessed_at = updates.lastAccessedAt;
    if (updates.chatHistoryId !== void 0)
      dbUpdates.chat_history_id = updates.chatHistoryId;
    const { data } = await supabaseAdmin.from("implementations").update(dbUpdates).eq("id", id).select().single();
    return data ? toImplementation(data) : void 0;
  }
  async deleteImplementation(id) {
    const impl = await this.getImplementationById(id);
    if (impl && impl.conceptId) {
      const others = await this.getImplementationsByConceptId(impl.conceptId);
      if (others.length <= 1) {
        await this.deleteConceptsWithProjects([impl.conceptId]);
        return true;
      }
    }
    const { error } = await supabaseAdmin.from("implementations").delete().eq("id", id);
    return !error;
  }
  // ── Project Feedback ─────────────────────────────────────────
  async createProjectFeedback(feedback) {
    const { data, error } = await supabaseAdmin.from("project_feedback").insert({
      user_id: feedback.userId ?? null,
      implementation_id: feedback.implementationId,
      difficulty_rating: feedback.difficultyRating,
      enjoyment_rating: feedback.enjoymentRating,
      met_objectives: feedback.metObjectives ?? [],
      learnt_skills: feedback.learntSkills ?? [],
      outcome_matches: feedback.outcomeMatches ?? true,
      feedback_text: feedback.feedbackText ?? null
    }).select().single();
    if (error) throw new Error(error.message);
    return toProjectFeedback(data);
  }
  async getProjectFeedbackByImplementationId(implementationId) {
    const { data } = await supabaseAdmin.from("project_feedback").select().eq("implementation_id", implementationId).maybeSingle();
    return data ? toProjectFeedback(data) : void 0;
  }
  async getProjectFeedbackByUser(userId) {
    const { data } = await supabaseAdmin.from("project_feedback").select().eq("user_id", userId);
    return (data ?? []).map(toProjectFeedback);
  }
  // ── Trends ───────────────────────────────────────────────────
  async getTrends(userId) {
    let query = supabaseAdmin.from("trends").select().order("published_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toTrend);
  }
  async getTrendById(id, userId) {
    let query = supabaseAdmin.from("trends").select().eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toTrend(data) : void 0;
  }
  async getTrendsByCategory(category) {
    const { data } = await supabaseAdmin.from("trends").select().eq("category", category).order("published_at", { ascending: false });
    return (data ?? []).map(toTrend);
  }
  async createTrend(insertTrend) {
    const { data, error } = await supabaseAdmin.from("trends").insert({
      user_id: insertTrend.userId ?? null,
      title: insertTrend.title,
      content: insertTrend.content,
      image_url: insertTrend.imageUrl ?? null,
      image_description: insertTrend.imageDescription ?? null,
      source: insertTrend.source,
      source_url: insertTrend.sourceUrl ?? null,
      relevance_to_user: insertTrend.relevanceToUser,
      related_concepts: insertTrend.relatedConcepts ?? [],
      category: insertTrend.category,
      read_by_user: insertTrend.readByUser ?? false,
      user_rating: insertTrend.userRating ?? null
    }).select().single();
    if (error) throw new Error(error.message);
    return toTrend(data);
  }
  async updateTrend(id, updates) {
    const dbUpdates = {};
    if (updates.title !== void 0) dbUpdates.title = updates.title;
    if (updates.content !== void 0) dbUpdates.content = updates.content;
    if (updates.imageUrl !== void 0) dbUpdates.image_url = updates.imageUrl;
    if (updates.imageDescription !== void 0)
      dbUpdates.image_description = updates.imageDescription;
    if (updates.source !== void 0) dbUpdates.source = updates.source;
    if (updates.sourceUrl !== void 0)
      dbUpdates.source_url = updates.sourceUrl;
    if (updates.relevanceToUser !== void 0)
      dbUpdates.relevance_to_user = updates.relevanceToUser;
    if (updates.relatedConcepts !== void 0)
      dbUpdates.related_concepts = updates.relatedConcepts;
    if (updates.category !== void 0) dbUpdates.category = updates.category;
    if (updates.readByUser !== void 0)
      dbUpdates.read_by_user = updates.readByUser;
    if (updates.userRating !== void 0)
      dbUpdates.user_rating = updates.userRating;
    const { data } = await supabaseAdmin.from("trends").update(dbUpdates).eq("id", id).select().single();
    return data ? toTrend(data) : void 0;
  }
  async deleteTrend(id) {
    const { error } = await supabaseAdmin.from("trends").delete().eq("id", id);
    return !error;
  }
  // ── Opportunity Projects ─────────────────────────────────────
  async getOpportunityProjects(userId) {
    let query = supabaseAdmin.from("opportunity_projects").select().order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toOpportunityProject);
  }
  async getOpportunityProjectById(id, userId) {
    let query = supabaseAdmin.from("opportunity_projects").select().eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toOpportunityProject(data) : void 0;
  }
  async createOpportunityProject(project) {
    const { data, error } = await supabaseAdmin.from("opportunity_projects").insert({
      user_id: project.userId ?? null,
      title: project.title,
      summary: project.summary,
      difficulty: project.difficulty,
      estimated_hours: project.estimatedHours,
      skills: project.skills ?? [],
      related_concept_ids: project.relatedConceptIds ?? [],
      recommended_implementation_id: project.recommendedImplementationId ?? null,
      location_context: project.locationContext ?? null,
      problem_type: project.problemType ?? "everyday"
    }).select().single();
    if (error) throw new Error(error.message);
    return toOpportunityProject(data);
  }
  async updateOpportunityProject(id, updates) {
    const dbUpdates = {};
    if (updates.title !== void 0) dbUpdates.title = updates.title;
    if (updates.summary !== void 0) dbUpdates.summary = updates.summary;
    if (updates.difficulty !== void 0)
      dbUpdates.difficulty = updates.difficulty;
    if (updates.estimatedHours !== void 0)
      dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.skills !== void 0) dbUpdates.skills = updates.skills;
    if (updates.relatedConceptIds !== void 0)
      dbUpdates.related_concept_ids = updates.relatedConceptIds;
    if (updates.recommendedImplementationId !== void 0)
      dbUpdates.recommended_implementation_id = updates.recommendedImplementationId;
    if (updates.locationContext !== void 0)
      dbUpdates.location_context = updates.locationContext;
    if (updates.problemType !== void 0)
      dbUpdates.problem_type = updates.problemType;
    const { data } = await supabaseAdmin.from("opportunity_projects").update(dbUpdates).eq("id", id).select().single();
    return data ? toOpportunityProject(data) : void 0;
  }
  async deleteOpportunityProject(id) {
    const { error } = await supabaseAdmin.from("opportunity_projects").delete().eq("id", id);
    return !error;
  }
  // ── Project Interactions ─────────────────────────────────────
  async createProjectInteraction(interaction) {
    const { data, error } = await supabaseAdmin.from("project_interactions").insert({
      user_id: interaction.userId ?? null,
      project_id: interaction.projectId,
      action: interaction.action
    }).select().single();
    if (error) throw new Error(error.message);
    return toProjectInteraction(data);
  }
  async getProjectInteractions() {
    const { data } = await supabaseAdmin.from("project_interactions").select().order("created_at", { ascending: false });
    return (data ?? []).map(toProjectInteraction);
  }
  async getProjectInteractionsByProjectId(projectId) {
    const { data } = await supabaseAdmin.from("project_interactions").select().eq("project_id", projectId).order("created_at", { ascending: false });
    return (data ?? []).map(toProjectInteraction);
  }
  // ── User Settings ────────────────────────────────────────────
  async getUserSettings(userId) {
    const { data } = await supabaseAdmin.from("user_settings").select().eq("user_id", userId).maybeSingle();
    return data ? toUserSettings(data) : void 0;
  }
  async createUserSettings(settings) {
    const { data, error } = await supabaseAdmin.from("user_settings").insert({
      user_id: settings.userId ?? null,
      enable_concept_count_generation: settings.enableConceptCountGeneration ?? true,
      enable_daily_generation: settings.enableDailyGeneration ?? true,
      concept_count_threshold: settings.conceptCountThreshold ?? 3,
      daily_generation_frequency_days: settings.dailyGenerationFrequencyDays ?? 1
    }).select().single();
    if (error) throw new Error(error.message);
    return toUserSettings(data);
  }
  async updateUserSettings(id, updates) {
    const dbUpdates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.enableConceptCountGeneration !== void 0)
      dbUpdates.enable_concept_count_generation = updates.enableConceptCountGeneration;
    if (updates.enableDailyGeneration !== void 0)
      dbUpdates.enable_daily_generation = updates.enableDailyGeneration;
    if (updates.conceptCountThreshold !== void 0)
      dbUpdates.concept_count_threshold = updates.conceptCountThreshold;
    if (updates.dailyGenerationFrequencyDays !== void 0)
      dbUpdates.daily_generation_frequency_days = updates.dailyGenerationFrequencyDays;
    const { data } = await supabaseAdmin.from("user_settings").update(dbUpdates).eq("id", id).select().single();
    return data ? toUserSettings(data) : void 0;
  }
  // ── User Mastered Prerequisites ──────────────────────────────
  async getUserMasteredPrerequisites(userId) {
    const { data } = await supabaseAdmin.from("user_mastered_prerequisites").select().eq("user_id", userId);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }
  async getMasteredPrerequisitesByImplementation(implementationId) {
    const { data } = await supabaseAdmin.from("user_mastered_prerequisites").select().eq("implementation_id", implementationId);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }
  async getMasteredPrerequisitesByName(userId, name) {
    const { data } = await supabaseAdmin.from("user_mastered_prerequisites").select().eq("user_id", userId).eq("prerequisite", name);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }
  async saveMasteredPrerequisites(prerequisites) {
    if (prerequisites.length === 0) return [];
    const rows = prerequisites.map((p) => ({
      user_id: p.userId ?? null,
      implementation_id: p.implementationId,
      prerequisite: p.prerequisite
    }));
    const { data, error } = await supabaseAdmin.from("user_mastered_prerequisites").insert(rows).select();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }
  // ── Project Versions ─────────────────────────────────────────
  async getProjectVersions(rootId) {
    const root = await this.getImplementationById(rootId);
    if (!root) return [];
    const allVersions = await this.getImplementationsByConceptId(root.conceptId);
    const sorted = allVersions.sort((a, b) => b.version - a.version);
    const uniqueTools = /* @__PURE__ */ new Map();
    for (const impl of sorted) {
      if (!uniqueTools.has(impl.tool) && impl.projectName === root.projectName) {
        uniqueTools.set(impl.tool, impl);
      }
    }
    return Array.from(uniqueTools.values());
  }
  async getLatestVersion(rootId) {
    const versions = await this.getProjectVersions(rootId);
    return versions[0];
  }
  // ── User Personalization ─────────────────────────────────────
  async getUserPersonalization(userId) {
    try {
      const { data } = await supabaseAdmin.from("user_personalization").select().eq("user_id", userId).maybeSingle();
      return data ? toUserPersonalization(data) : void 0;
    } catch {
      return void 0;
    }
  }
  async createUserPersonalization(personalization) {
    const { data, error } = await supabaseAdmin.from("user_personalization").insert({
      user_id: personalization.userId ?? null,
      career_goals: personalization.careerGoals ?? [],
      current_career: personalization.currentCareer ?? null,
      aspiring_career: personalization.aspiringCareer ?? null,
      desired_role: personalization.desiredRole ?? null,
      target_industry: personalization.targetIndustry ?? null,
      years_of_experience: personalization.yearsOfExperience ?? null,
      skills_focus: personalization.skillsFocus ?? [],
      preferred_voice: personalization.preferredVoice ?? "",
      theme: personalization.theme ?? "system",
      location: personalization.location ?? null,
      location_last_updated: personalization.locationLastUpdated ?? null,
      project_preferences: personalization.projectPreferences ?? {}
    }).select().single();
    if (error) throw new Error(error.message);
    return toUserPersonalization(data);
  }
  async updateUserPersonalization(id, updates) {
    const dbUpdates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.careerGoals !== void 0)
      dbUpdates.career_goals = updates.careerGoals;
    if (updates.currentCareer !== void 0)
      dbUpdates.current_career = updates.currentCareer;
    if (updates.aspiringCareer !== void 0)
      dbUpdates.aspiring_career = updates.aspiringCareer;
    if (updates.desiredRole !== void 0)
      dbUpdates.desired_role = updates.desiredRole;
    if (updates.targetIndustry !== void 0)
      dbUpdates.target_industry = updates.targetIndustry;
    if (updates.yearsOfExperience !== void 0)
      dbUpdates.years_of_experience = updates.yearsOfExperience;
    if (updates.skillsFocus !== void 0)
      dbUpdates.skills_focus = updates.skillsFocus;
    if (updates.preferredVoice !== void 0)
      dbUpdates.preferred_voice = updates.preferredVoice;
    if (updates.theme !== void 0) dbUpdates.theme = updates.theme;
    if (updates.location !== void 0) dbUpdates.location = updates.location;
    if (updates.locationLastUpdated !== void 0)
      dbUpdates.location_last_updated = updates.locationLastUpdated;
    if (updates.projectPreferences !== void 0)
      dbUpdates.project_preferences = updates.projectPreferences;
    const { data } = await supabaseAdmin.from("user_personalization").update(dbUpdates).eq("id", id).select().single();
    return data ? toUserPersonalization(data) : void 0;
  }
  // ── Generation Tracking ──────────────────────────────────────
  async getGenerationTracking(userId) {
    const { data } = await supabaseAdmin.from("generation_tracking").select().eq("user_id", userId).maybeSingle();
    return data ? toGenerationTracking(data) : void 0;
  }
  async createGenerationTracking(tracking) {
    const { data, error } = await supabaseAdmin.from("generation_tracking").insert({
      user_id: tracking.userId ?? null,
      last_daily_generation: tracking.lastDailyGeneration ?? null,
      concept_count_since_last_generation: tracking.conceptCountSinceLastGeneration ?? 0
    }).select().single();
    if (error) throw new Error(error.message);
    return toGenerationTracking(data);
  }
  async updateGenerationTracking(id, updates) {
    const dbUpdates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.lastDailyGeneration !== void 0)
      dbUpdates.last_daily_generation = updates.lastDailyGeneration;
    if (updates.conceptCountSinceLastGeneration !== void 0)
      dbUpdates.concept_count_since_last_generation = updates.conceptCountSinceLastGeneration;
    const { data } = await supabaseAdmin.from("generation_tracking").update(dbUpdates).eq("id", id).select().single();
    return data ? toGenerationTracking(data) : void 0;
  }
  // ── Learner Profiles ─────────────────────────────────────────
  async getLatestLearnerProfile(userId) {
    const { data } = await supabaseAdmin.from("learner_profiles").select().eq("user_id", userId).order("updated_at", { ascending: false }).maybeSingle();
    return data ? toLearnerProfile(data) : void 0;
  }
  async createLearnerProfile(profile) {
    const { data, error } = await supabaseAdmin.from("learner_profiles").insert({
      user_id: profile.userId ?? null,
      profile: profile.profile,
      concepts_included: profile.conceptsIncluded ?? []
    }).select().single();
    if (error) throw new Error(error.message);
    return toLearnerProfile(data);
  }
  // ── User Claimed Knowledge ───────────────────────────────────
  async getUserClaimedKnowledge(userId) {
    const { data } = await supabaseAdmin.from("user_claimed_knowledge").select().eq("user_id", userId).order("claimed_at", { ascending: false });
    return (data ?? []).map(toUserClaimedKnowledge);
  }
  async createUserClaimedKnowledge(knowledge) {
    const { data, error } = await supabaseAdmin.from("user_claimed_knowledge").insert({
      user_id: knowledge.userId ?? null,
      concept_id: knowledge.conceptId,
      source: knowledge.source ?? "other",
      proficiency_level: knowledge.proficiencyLevel ?? "intermediate"
    }).select().single();
    if (error) throw new Error(error.message);
    return toUserClaimedKnowledge(data);
  }
  // ── Resources ────────────────────────────────────────────────
  async getResources() {
    const { data } = await supabaseAdmin.from("resources").select().order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }
  async getResourcesByConceptId(conceptId) {
    const { data } = await supabaseAdmin.from("resources").select().eq("concept_id", conceptId).order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }
  async getResourcesByProjectId(projectId) {
    const { data } = await supabaseAdmin.from("resources").select().eq("project_id", projectId).order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }
  async getResourcesByPrerequisite(userId, prerequisite) {
    const { data } = await supabaseAdmin.from("resources").select().eq("user_id", userId).eq("prerequisite", prerequisite).order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }
  async createResource(resource) {
    const { data, error } = await supabaseAdmin.from("resources").insert({
      user_id: resource.userId ?? null,
      concept_id: resource.conceptId ?? null,
      project_id: resource.projectId ?? null,
      title: resource.title,
      url: resource.url,
      type: resource.type,
      source: resource.source,
      description: resource.description ?? null,
      relevance_score: resource.relevanceScore ?? 50,
      prerequisite: resource.prerequisite ?? null
    }).select().single();
    if (error) throw new Error(error.message);
    return toResource(data);
  }
  async createMultipleResources(res) {
    if (res.length === 0) return [];
    const rows = res.map((r) => ({
      user_id: r.userId ?? null,
      concept_id: r.conceptId ?? null,
      project_id: r.projectId ?? null,
      title: r.title,
      url: r.url,
      type: r.type,
      source: r.source,
      description: r.description ?? null,
      relevance_score: r.relevanceScore ?? 50,
      prerequisite: r.prerequisite ?? null
    }));
    const { data, error } = await supabaseAdmin.from("resources").insert(rows).select();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toResource);
  }
  // ── Idea Sessions ────────────────────────────────────────────
  async getIdeaSessions(userId) {
    const { data } = await supabaseAdmin.from("idea_sessions").select().eq("user_id", userId).order("updated_at", { ascending: false });
    return (data ?? []).map(toIdeaSession);
  }
  async getIdeaSessionById(id, userId) {
    const { data } = await supabaseAdmin.from("idea_sessions").select().eq("id", id).eq("user_id", userId).maybeSingle();
    return data ? toIdeaSession(data) : void 0;
  }
  async createIdeaSession(insertSession) {
    const { data, error } = await supabaseAdmin.from("idea_sessions").insert({
      user_id: insertSession.userId ?? null,
      title: insertSession.title ?? "New Idea",
      messages: insertSession.messages ?? [],
      idea_summary: insertSession.ideaSummary ?? null,
      analysis: insertSession.analysis ?? null,
      status: insertSession.status ?? "chatting",
      project_id: insertSession.projectId ?? null
    }).select().single();
    if (error) throw new Error(error.message);
    return toIdeaSession(data);
  }
  async updateIdeaSession(id, updates) {
    const dbUpdates = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.title !== void 0) dbUpdates.title = updates.title;
    if (updates.messages !== void 0) dbUpdates.messages = updates.messages;
    if (updates.ideaSummary !== void 0)
      dbUpdates.idea_summary = updates.ideaSummary;
    if (updates.analysis !== void 0) dbUpdates.analysis = updates.analysis;
    if (updates.status !== void 0) dbUpdates.status = updates.status;
    if (updates.projectId !== void 0)
      dbUpdates.project_id = updates.projectId;
    const { data } = await supabaseAdmin.from("idea_sessions").update(dbUpdates).eq("id", id).select().single();
    return data ? toIdeaSession(data) : void 0;
  }
  async deleteIdeaSession(id) {
    const { error } = await supabaseAdmin.from("idea_sessions").delete().eq("id", id);
    return !error;
  }
  // ── Data Deletion ────────────────────────────────────────────
  async clearAllChatHistory(userId) {
    const { data: sessions } = await supabaseAdmin.from("chat_sessions").select("id").eq("user_id", userId);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    let msgCount = 0;
    if (sessionIds.length > 0) {
      const { data: msgs } = await supabaseAdmin.from("chat_messages").delete().in("session_id", sessionIds).select("id");
      msgCount = (msgs ?? []).length;
    }
    const { data: deletedSessions } = await supabaseAdmin.from("chat_sessions").delete().eq("user_id", userId).select("id");
    return msgCount + (deletedSessions ?? []).length;
  }
  async clearAllProjects(userId) {
    await supabaseAdmin.from("project_feedback").delete().eq("user_id", userId);
    await supabaseAdmin.from("project_interactions").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_mastered_prerequisites").delete().eq("user_id", userId);
    await supabaseAdmin.from("resources").delete().eq("user_id", userId);
    const { data: sessions } = await supabaseAdmin.from("chat_sessions").select("id").eq("user_id", userId);
    if (sessions && sessions.length > 0) {
      await supabaseAdmin.from("chat_messages").delete().in("session_id", sessions.map((s) => s.id));
    }
    await supabaseAdmin.from("chat_sessions").delete().eq("user_id", userId);
    await supabaseAdmin.from("opportunity_projects").delete().eq("user_id", userId);
    await supabaseAdmin.from("trends").delete().eq("user_id", userId);
    const { data: deleted } = await supabaseAdmin.from("implementations").delete().eq("user_id", userId).select("id");
    return (deleted ?? []).length;
  }
  async deleteConceptsWithProjects(conceptIds) {
    if (conceptIds.length === 0) return 0;
    let totalDeleted = 0;
    for (const conceptId of conceptIds) {
      const { data: impls } = await supabaseAdmin.from("implementations").select("id").eq("concept_id", conceptId);
      const implIds = (impls ?? []).map((i) => i.id);
      if (implIds.length > 0) {
        const { data: implSessions } = await supabaseAdmin.from("chat_sessions").select("id").in("project_id", implIds);
        if (implSessions && implSessions.length > 0) {
          await supabaseAdmin.from("chat_messages").delete().in("session_id", implSessions.map((s) => s.id));
          await supabaseAdmin.from("chat_sessions").delete().in("id", implSessions.map((s) => s.id));
        }
        await supabaseAdmin.from("project_feedback").delete().in("implementation_id", implIds);
        await supabaseAdmin.from("user_mastered_prerequisites").delete().in("implementation_id", implIds);
        await supabaseAdmin.from("project_interactions").delete().in("project_id", implIds);
      }
      const { data: conceptSessions } = await supabaseAdmin.from("chat_sessions").select("id").eq("concept_id", conceptId);
      if (conceptSessions && conceptSessions.length > 0) {
        await supabaseAdmin.from("chat_messages").delete().in("session_id", conceptSessions.map((s) => s.id));
        await supabaseAdmin.from("chat_sessions").delete().in("id", conceptSessions.map((s) => s.id));
      }
      await supabaseAdmin.from("resources").delete().eq("concept_id", conceptId);
      await supabaseAdmin.from("user_claimed_knowledge").delete().eq("concept_id", conceptId);
      await supabaseAdmin.from("implementations").delete().eq("concept_id", conceptId);
      const { data: deleted } = await supabaseAdmin.from("concepts").delete().eq("id", conceptId).select("id");
      totalDeleted += (deleted ?? []).length;
    }
    return totalDeleted;
  }
  async deleteAllData(userId) {
    const { data: sessions } = await supabaseAdmin.from("chat_sessions").select("id").eq("user_id", userId);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    let msgCount = 0;
    if (sessionIds.length > 0) {
      const { data: msgs } = await supabaseAdmin.from("chat_messages").delete().in("session_id", sessionIds).select("id");
      msgCount = (msgs ?? []).length;
    }
    const { data: deletedSessions } = await supabaseAdmin.from("chat_sessions").delete().eq("user_id", userId).select("id");
    const { data: deletedImpls } = await supabaseAdmin.from("implementations").delete().eq("user_id", userId).select("id");
    const { data: deletedConcepts } = await supabaseAdmin.from("concepts").delete().eq("user_id", userId).select("id");
    await supabaseAdmin.from("project_feedback").delete().eq("user_id", userId);
    await supabaseAdmin.from("project_interactions").delete().eq("user_id", userId);
    await supabaseAdmin.from("opportunity_projects").delete().eq("user_id", userId);
    await supabaseAdmin.from("trends").delete().eq("user_id", userId);
    await supabaseAdmin.from("resources").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_mastered_prerequisites").delete().eq("user_id", userId);
    await supabaseAdmin.from("generation_tracking").delete().eq("user_id", userId);
    await supabaseAdmin.from("learner_profiles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_claimed_knowledge").delete().eq("user_id", userId);
    await supabaseAdmin.from("idea_sessions").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_personalization").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);
    return {
      concepts: (deletedConcepts ?? []).length,
      implementations: (deletedImpls ?? []).length,
      sessions: (deletedSessions ?? []).length,
      messages: msgCount
    };
  }
};
var storage = new DbStorage();

// shared/schema.ts
import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
var profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").unique().notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = z.object({
  id: z.string().optional(),
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  avatarUrl: z.string().optional().nullable()
});
var concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  originalInput: text("original_input"),
  title: text("title").notNull(),
  category: text("category").notNull(),
  problem: text("problem").notNull(),
  what: text("what").notNull(),
  why: text("why").notNull(),
  how: text("how").notNull(),
  where: jsonb("where_applications").$type().notNull(),
  who: text("who").notNull(),
  when: text("when_context").notNull(),
  pseudocode: text("pseudocode"),
  tags: jsonb("tags").$type().default([]),
  isFavorite: boolean("is_favorite").default(false),
  prerequisites: jsonb("prerequisites").$type().default({ essential: [], helpful: [], optional: [] }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull()
});
var insertConceptSchema = z.object({
  userId: z.string().optional().nullable(),
  originalInput: z.string().optional().nullable(),
  title: z.string(),
  category: z.string(),
  problem: z.string(),
  what: z.string(),
  why: z.string(),
  how: z.string(),
  where: z.array(z.string()),
  who: z.string(),
  when: z.string(),
  pseudocode: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isFavorite: z.boolean().optional().nullable(),
  prerequisites: z.object({
    essential: z.array(z.string()),
    helpful: z.array(z.string()),
    optional: z.array(z.string())
  }).optional().nullable(),
  lastAccessedAt: z.date().optional().nullable()
});
var chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  conceptId: integer("concept_id"),
  projectId: integer("project_id"),
  tags: jsonb("tags").$type().default([]),
  isCollapsed: boolean("is_collapsed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull()
});
var insertChatSessionSchema = z.object({
  userId: z.string().optional().nullable(),
  type: z.string(),
  conceptId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isCollapsed: z.boolean().optional().nullable()
});
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: text("user_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertChatMessageSchema = z.object({
  sessionId: z.number(),
  userId: z.string().optional().nullable(),
  role: z.string(),
  content: z.string()
});
var trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  imageDescription: text("image_description"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  relevanceToUser: text("relevance_to_user").notNull(),
  relatedConcepts: jsonb("related_concepts").$type().default([]),
  category: text("category").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  readByUser: boolean("read_by_user").default(false),
  userRating: integer("user_rating")
});
var insertTrendSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string(),
  content: z.string(),
  imageUrl: z.string().optional().nullable(),
  imageDescription: z.string().optional().nullable(),
  source: z.string(),
  sourceUrl: z.string().optional().nullable(),
  relevanceToUser: z.string(),
  relatedConcepts: z.array(z.string()).optional().nullable(),
  category: z.string(),
  readByUser: z.boolean().optional().nullable(),
  userRating: z.number().optional().nullable()
});
var implementations = pgTable("implementations", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id").notNull(),
  chatHistoryId: integer("chat_history_id"),
  projectName: text("project_name").notNull(),
  type: text("type").notNull(),
  tool: text("tool").notNull(),
  language: text("language").notNull(),
  imageUrl: text("image_url"),
  components: jsonb("components").$type().default([]),
  learningGoals: jsonb("learning_goals").$type().default([]),
  expectedOutcomes: jsonb("expected_outcomes").$type().default([]),
  requiredArtifacts: jsonb("required_artifacts").$type().default([]),
  problemAddressed: text("problem_addressed"),
  whySuggested: text("why_suggested"),
  realWorldContext: text("real_world_context"),
  industry: text("industry"),
  code: text("code"),
  pseudocode: text("pseudocode"),
  flowDiagram: text("flow_diagram"),
  instructions: text("instructions"),
  status: text("status").notNull().default("preview"),
  version: integer("version").default(1).notNull(),
  previousVersionId: integer("previous_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull()
});
var insertImplementationSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number(),
  chatHistoryId: z.number().optional().nullable(),
  projectName: z.string(),
  type: z.string(),
  tool: z.string(),
  language: z.string(),
  imageUrl: z.string().optional().nullable(),
  components: z.array(z.string()).optional().nullable(),
  learningGoals: z.array(z.string()).optional().nullable(),
  expectedOutcomes: z.array(z.string()).optional().nullable(),
  requiredArtifacts: z.array(z.string()).optional().nullable(),
  problemAddressed: z.string().optional().nullable(),
  whySuggested: z.string().optional().nullable(),
  realWorldContext: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  pseudocode: z.string().optional().nullable(),
  flowDiagram: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  version: z.number().optional().nullable(),
  previousVersionId: z.number().optional().nullable(),
  lastAccessedAt: z.date().optional().nullable()
});
var projectFeedback = pgTable("project_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  implementationId: integer("implementation_id").notNull(),
  difficultyRating: integer("difficulty_rating").notNull(),
  enjoymentRating: integer("enjoyment_rating").notNull(),
  metObjectives: jsonb("met_objectives").$type().default([]),
  learntSkills: jsonb("learnt_skills").$type().default([]),
  outcomeMatches: boolean("outcome_matches").default(true),
  feedbackText: text("feedback_text"),
  completedAt: timestamp("completed_at").defaultNow().notNull()
});
var insertProjectFeedbackSchema = z.object({
  userId: z.string().optional().nullable(),
  implementationId: z.number(),
  difficultyRating: z.number(),
  enjoymentRating: z.number(),
  metObjectives: z.array(z.string()).optional().nullable(),
  learntSkills: z.array(z.string()).optional().nullable(),
  outcomeMatches: z.boolean().optional().nullable(),
  feedbackText: z.string().optional().nullable()
});
var opportunityProjects = pgTable("opportunity_projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  skills: jsonb("skills").$type().notNull(),
  relatedConceptIds: jsonb("related_concept_ids").$type().default([]),
  recommendedImplementationId: integer("recommended_implementation_id"),
  locationContext: text("location_context"),
  problemType: text("problem_type").default("everyday"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull()
});
var insertOpportunityProjectSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string(),
  summary: z.string(),
  difficulty: z.string(),
  estimatedHours: z.number(),
  skills: z.array(z.string()),
  relatedConceptIds: z.array(z.number()).optional().nullable(),
  recommendedImplementationId: z.number().optional().nullable(),
  locationContext: z.string().optional().nullable(),
  problemType: z.string().optional().nullable()
});
var projectInteractions = pgTable("project_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  projectId: integer("project_id").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertProjectInteractionSchema = z.object({
  userId: z.string().optional().nullable(),
  projectId: z.number(),
  action: z.string()
});
var generationTracking = pgTable("generation_tracking", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  lastDailyGeneration: timestamp("last_daily_generation"),
  conceptCountSinceLastGeneration: integer("concept_count_since_last_generation").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertGenerationTrackingSchema = z.object({
  userId: z.string().optional().nullable(),
  lastDailyGeneration: z.date().optional().nullable(),
  conceptCountSinceLastGeneration: z.number().optional().nullable()
});
var learnerProfiles = pgTable("learner_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  profile: text("profile").notNull(),
  conceptsIncluded: jsonb("concepts_included").$type().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertLearnerProfileSchema = z.object({
  userId: z.string().optional().nullable(),
  profile: z.string(),
  conceptsIncluded: z.array(z.number())
});
var userClaimedKnowledge = pgTable("user_claimed_knowledge", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id").notNull(),
  source: text("source").notNull().default("other"),
  proficiencyLevel: text("proficiency_level").notNull().default("intermediate"),
  claimedAt: timestamp("claimed_at").defaultNow().notNull()
});
var insertUserClaimedKnowledgeSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number(),
  source: z.string().optional(),
  proficiencyLevel: z.string().optional()
});
var resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id"),
  projectId: integer("project_id"),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  description: text("description"),
  relevanceScore: integer("relevance_score").default(50),
  prerequisite: text("prerequisite"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull()
});
var insertResourceSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  title: z.string(),
  url: z.string(),
  type: z.string(),
  source: z.string(),
  description: z.string().optional().nullable(),
  relevanceScore: z.number().optional().nullable(),
  prerequisite: z.string().optional().nullable()
});
var userMasteredPrerequisites = pgTable("user_mastered_prerequisites", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  implementationId: integer("implementation_id").notNull(),
  prerequisite: text("prerequisite").notNull(),
  masteredAt: timestamp("mastered_at").defaultNow().notNull()
});
var insertUserMasteredPrerequisitesSchema = z.object({
  userId: z.string().optional().nullable(),
  implementationId: z.number(),
  prerequisite: z.string()
});
var userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  enableConceptCountGeneration: boolean("enable_concept_count_generation").default(true).notNull(),
  enableDailyGeneration: boolean("enable_daily_generation").default(true).notNull(),
  conceptCountThreshold: integer("concept_count_threshold").default(3).notNull(),
  dailyGenerationFrequencyDays: integer("daily_generation_frequency_days").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserSettingsSchema = z.object({
  userId: z.string().optional().nullable(),
  enableConceptCountGeneration: z.boolean().optional(),
  enableDailyGeneration: z.boolean().optional(),
  conceptCountThreshold: z.number().optional(),
  dailyGenerationFrequencyDays: z.number().optional()
});
var userPersonalization = pgTable("user_personalization", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  careerGoals: jsonb("career_goals").$type().default([]),
  currentCareer: text("current_career"),
  aspiringCareer: text("aspiring_career"),
  desiredRole: text("desired_role"),
  targetIndustry: text("target_industry"),
  yearsOfExperience: integer("years_of_experience"),
  skillsFocus: jsonb("skills_focus").$type().default([]),
  preferredVoice: text("preferred_voice").default("").notNull(),
  theme: text("theme").default("system").notNull(),
  location: text("location"),
  locationLastUpdated: timestamp("location_last_updated"),
  projectPreferences: jsonb("project_preferences").$type().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserPersonalizationSchema = z.object({
  userId: z.string().optional().nullable(),
  careerGoals: z.array(z.string()).optional().nullable(),
  currentCareer: z.string().optional().nullable(),
  aspiringCareer: z.string().optional().nullable(),
  desiredRole: z.string().optional().nullable(),
  targetIndustry: z.string().optional().nullable(),
  yearsOfExperience: z.number().optional().nullable(),
  skillsFocus: z.array(z.string()).optional().nullable(),
  preferredVoice: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  locationLastUpdated: z.date().optional().nullable(),
  projectPreferences: z.object({
    preferredComplexity: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    preferredApproach: z.enum(["simulation", "code", "theory", "mixed"]).optional(),
    preferredTools: z.array(z.string()).optional(),
    topicLean: z.string().optional(),
    additionalNotes: z.string().optional(),
    confidenceLevel: z.number().optional()
  }).optional().nullable()
});
var ideaSessions = pgTable("idea_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull().default("New Idea"),
  messages: jsonb("messages").$type().default([]),
  ideaSummary: text("idea_summary"),
  analysis: jsonb("analysis"),
  status: text("status").notNull().default("chatting"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertIdeaSessionSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string().optional(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })).optional().nullable(),
  ideaSummary: z.string().optional().nullable(),
  analysis: z.any().optional().nullable(),
  status: z.string().optional(),
  projectId: z.number().optional().nullable()
});

// server/routes.ts
init_supabase_edge_functions();
init_resource_fetcher();
init_sse_generator();
async function generateAndSaveProjects(userId) {
  const concepts2 = await storage.getConcepts(userId);
  if (concepts2.length === 0) {
    throw new Error("No concepts found to generate projects");
  }
  const personalization = await storage.getUserPersonalization(userId);
  const ideaSessions2 = await storage.getIdeaSessions(userId);
  const ideaTitles = ideaSessions2.map((s) => s.title).filter(Boolean).slice(0, 5);
  const generatedProjects = await generateOpportunityProjects(
    concepts2,
    personalization?.location || void 0,
    personalization?.careerGoals || void 0,
    ideaTitles
  );
  const savedProjects = await Promise.all(
    generatedProjects.map((proj) => {
      const conceptIds = concepts2.slice(0, 2).map((c) => c.id);
      const estimatedHours = parseInt(proj.estimatedTime?.match(/\d+/)?.[0] || "8");
      return storage.createOpportunityProject({
        userId,
        title: proj.projectName,
        summary: proj.reasons?.join(" ") || "No summary provided",
        difficulty: (proj.difficulty || "intermediate").toLowerCase(),
        estimatedHours,
        skills: proj.prerequisites || [],
        relatedConceptIds: conceptIds,
        recommendedImplementationId: null,
        locationContext: proj.locationContext || null,
        problemType: proj.problemType || "everyday"
      });
    })
  );
  return savedProjects;
}
async function checkConceptCountGeneration(userId) {
  try {
    const settings = await storage.getUserSettings(userId);
    if (!settings || !settings.enableConceptCountGeneration) {
      return;
    }
    let tracking = await storage.getGenerationTracking(userId);
    if (!tracking) {
      tracking = await storage.createGenerationTracking({
        userId,
        lastDailyGeneration: /* @__PURE__ */ new Date(),
        conceptCountSinceLastGeneration: 0
      });
    }
    const newCount = (tracking.conceptCountSinceLastGeneration || 0) + 1;
    await storage.updateGenerationTracking(tracking.id, {
      conceptCountSinceLastGeneration: newCount
    });
    const threshold = settings.conceptCountThreshold || 3;
    if (newCount >= threshold) {
      const concepts2 = await storage.getConcepts(userId);
      if (concepts2.length >= threshold) {
        console.log(`Running automatic project generation after ${threshold} concepts`);
        await generateAndSaveProjects(userId);
        await storage.updateGenerationTracking(tracking.id, {
          conceptCountSinceLastGeneration: 0
        });
      }
    }
  } catch (error) {
    console.error("Concept count generation check error:", error);
  }
}
async function generateAndSaveTrends(userId) {
  const concepts2 = await storage.getConcepts(userId);
  if (concepts2.length === 0) {
    throw new Error("No concepts found to generate trends");
  }
  const personalization = await storage.getUserPersonalization(userId);
  const conceptTitles = concepts2.map((c) => c.title);
  const primaryCategory = concepts2[0]?.category || "General";
  const generatedTrends = await generateTrendContent(conceptTitles, primaryCategory);
  const savedTrends = await Promise.all(
    generatedTrends.map(async (trend) => {
      const imageUrl = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(trend.title)}`;
      return storage.createTrend({
        userId,
        title: trend.title,
        content: trend.content,
        imageUrl,
        source: trend.source,
        relevanceToUser: trend.relevanceToUser,
        relatedConcepts: trend.relatedConcepts,
        category: trend.category,
        sourceUrl: null,
        readByUser: false,
        userRating: null
      });
    })
  );
  return savedTrends;
}
async function checkTrendGeneration(userId) {
  try {
    const concepts2 = await storage.getConcepts(userId);
    if (concepts2.length > 0 && concepts2.length % 2 === 0) {
      console.log(`Running automatic trend generation after ${concepts2.length} concepts`);
      await generateAndSaveTrends(userId);
    }
  } catch (error) {
    console.error("Trend generation check error:", error);
  }
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "knowledgelink" });
  });
  app2.get("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      let p = await storage.getUserPersonalization(userId);
      if (!p) {
        p = await storage.createUserPersonalization({
          userId,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null
        });
      }
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });
  app2.get("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      let p = await storage.getUserPersonalization(userId);
      if (!p) {
        p = await storage.createUserPersonalization({
          userId,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null
        });
      }
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });
  app2.patch("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const p = await storage.getUserPersonalization(userId);
      if (!p) return res.status(404).json({ message: "Not found" });
      const allowedThemeFields = ["theme"];
      const safeUpdate = {};
      for (const key of allowedThemeFields) {
        if (key in req.body) safeUpdate[key] = req.body[key];
      }
      const updated = await storage.updateUserPersonalization(p.id, safeUpdate);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update personalization:", error);
      res.status(500).json({ message: "Failed to update" });
    }
  });
  app2.patch("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const p = await storage.getUserPersonalization(userId);
      if (!p) return res.status(404).json({ message: "Not found" });
      const allowedFields = [
        "careerGoals",
        "currentCareer",
        "aspiringCareer",
        "desiredRole",
        "targetIndustry",
        "yearsOfExperience",
        "skillsFocus",
        "preferredVoice",
        "theme",
        "location",
        "locationLastUpdated",
        "projectPreferences"
      ];
      const safeUpdate = {};
      for (const key of allowedFields) {
        if (key in req.body) safeUpdate[key] = req.body[key];
      }
      const merged = { ...p, ...safeUpdate };
      const updated = await storage.updateUserPersonalization(p.id, merged);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update user personalization:", error);
      res.status(500).json({ message: "Failed to update" });
    }
  });
  app2.get("/api/user-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });
  app2.patch("/api/user-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const validated = insertUserSettingsSchema.partial().parse(req.body);
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1
        });
      }
      const updated = await storage.updateUserSettings(settings.id, validated);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update user settings:", error);
      res.status(400).json({ message: "Invalid settings data" });
    }
  });
  app2.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;
      if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.startsWith("data:image/")) {
        const { data: updated, error } = await supabaseAdmin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId).select().single();
        if (error) throw error;
        res.json({ ...req.user, avatarUrl });
      } else {
        res.status(400).json({ message: "Invalid image data" });
      }
    } catch (error) {
      console.error("Avatar update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      await storage.deleteUser(userId);
      req.logout((err) => {
        if (err) return res.status(500).json({ message: "Failed to logout after deletion" });
        res.sendStatus(204);
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  app2.post("/api/data/clear-chat-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const count = await storage.clearAllChatHistory(userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Clear chat history error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });
  app2.post("/api/data/clear-all-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const count = await storage.clearAllProjects(userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Clear all projects error:", error);
      res.status(500).json({ message: "Failed to clear projects" });
    }
  });
  app2.post("/api/data/delete-concepts-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const userConcepts = await storage.getConcepts(userId);
      const conceptIds = userConcepts.map((c) => c.id);
      const count = await storage.deleteConceptsWithProjects(conceptIds);
      await supabaseAdmin.from("idea_sessions").delete().eq("user_id", userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Delete concepts error:", error);
      res.status(500).json({ message: "Failed to delete concepts and projects" });
    }
  });
  app2.post("/api/data/delete-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const result = await storage.deleteAllData(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Delete all data error:", error);
      res.status(500).json({ message: "Failed to reset account data" });
    }
  });
  app2.get("/api/implementations/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const versions = await storage.getProjectVersions(id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });
  app2.get("/api/concepts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      res.json(concepts2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch concepts" });
    }
  });
  app2.get("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      const concept = await storage.getConceptById(id);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const implementations2 = await storage.getImplementationsByConceptId(id);
      const latestImplementation = implementations2.length > 0 ? implementations2[0] : null;
      res.json({ ...concept, latestImplementation });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch concept" });
    }
  });
  app2.patch("/api/concepts/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const concept = await storage.updateConcept(id, { lastAccessedAt: /* @__PURE__ */ new Date() });
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });
  app2.patch("/api/implementations/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updates = { lastAccessedAt: /* @__PURE__ */ new Date() };
      if (status) {
        updates.status = status;
      }
      const implementation = await storage.updateImplementation(id, updates);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });
  app2.patch("/api/opportunity-projects/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateOpportunityProject(id, { lastAccessedAt: /* @__PURE__ */ new Date() });
      if (!project) {
        return res.status(404).json({ message: "Opportunity project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });
  app2.post("/api/concepts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid User Session" });
      }
      const validated = insertConceptSchema.parse({
        ...req.body,
        userId
      });
      const concept = await storage.createConcept(validated);
      const implementations2 = await storage.getImplementationsByConceptId(concept.id);
      const latestImplementation = implementations2.length > 0 ? implementations2[0] : null;
      checkConceptCountGeneration(userId).catch((err) => console.log("Generation background task error (likely quota):", err.message));
      checkTrendGeneration(userId).catch((err) => console.log("Trend generation background task error (likely quota):", err.message));
      res.status(201).json({ ...concept, latestImplementation });
    } catch (error) {
      console.error("Concept creation error:", error);
      res.status(400).json({ message: "Invalid concept data" });
    }
  });
  app2.patch("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const concept = await storage.updateConcept(id, updates);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Failed to update concept" });
    }
  });
  app2.delete("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteConceptsWithProjects([id]);
      if (success === 0) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete concept error:", error);
      res.status(500).json({ message: "Failed to delete concept" });
    }
  });
  app2.get("/api/chat-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });
  app2.get("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      const session3 = await storage.getChatSessionById(id, userId);
      if (!session3) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });
  app2.get("/api/concepts/:conceptId/chat-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const conceptId = parseInt(req.params.conceptId);
      const session3 = await storage.getChatSessionByConceptId(conceptId);
      res.json(session3 || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });
  app2.get("/api/implementations/:implementationId/chat-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const implementationId = parseInt(req.params.implementationId);
      const session3 = await storage.getChatSessionByProjectId(implementationId);
      res.json(session3 || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });
  app2.post("/api/chat-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const validated = insertChatSessionSchema.parse({
        ...req.body,
        userId
      });
      const session3 = await storage.createChatSession(validated);
      res.status(201).json(session3);
    } catch (error) {
      console.error("Chat session creation error:", error);
      res.status(400).json({ message: "Invalid chat session data" });
    }
  });
  app2.patch("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const session3 = await storage.updateChatSession(id, updates);
      if (!session3) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });
  app2.delete("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChatSession(id);
      if (!success) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat session" });
    }
  });
  app2.get("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getChatMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const sessionId = parseInt(req.params.sessionId);
      const validated = insertChatMessageSchema.parse({
        ...req.body,
        sessionId,
        userId
      });
      const message = await storage.createChatMessage(validated);
      res.status(201).json(message);
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });
  app2.post("/api/ai/generate-5wh", async (req, res) => {
    try {
      const { userInput } = req.body;
      if (!userInput) {
        return res.status(400).json({ message: "userInput is required" });
      }
      const result = await generate5WH(userInput);
      res.json(result);
    } catch (error) {
      console.error("5W+H generation error:", error);
      res.status(500).json({ message: "Failed to generate 5W+H" });
    }
  });
  app2.post("/api/ai/inline-prompt", async (req, res) => {
    try {
      const { userInput, previousPrompts = [], recentTyping } = req.body;
      if (!userInput) {
        return res.status(400).json({ message: "userInput is required" });
      }
      const recent = recentTyping || userInput.split(/[.!?]\s+/).pop() || userInput;
      const prompt = await generateInlinePrompt(userInput, previousPrompts, recent);
      res.json({ prompt });
    } catch (error) {
      console.error("Inline prompt generation error:", error);
      res.status(500).json({ message: "Failed to generate prompt" });
    }
  });
  app2.post("/api/ai/chat-response", async (req, res) => {
    try {
      const { userMessage, conversationHistory = [], conceptContext } = req.body;
      if (!userMessage) {
        return res.status(400).json({ message: "userMessage is required" });
      }
      const response = await generateChatResponse(
        userMessage,
        conversationHistory,
        conceptContext
      );
      res.json({ response });
    } catch (error) {
      console.error("Chat response generation error:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });
  app2.post("/api/ai/generate-tags", async (req, res) => {
    try {
      const { conversationContent } = req.body;
      if (!conversationContent) {
        return res.status(400).json({ message: "conversationContent is required" });
      }
      const tags = await generateTags(conversationContent);
      res.json({ tags });
    } catch (error) {
      console.error("Tag generation error:", error);
      res.status(500).json({ message: "Failed to generate tags" });
    }
  });
  app2.get("/api/implementations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const implementations2 = await storage.getImplementations(userId);
      res.json(implementations2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch implementations" });
    }
  });
  app2.post("/api/implementations/preview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { conceptId, conversationHistory = [] } = req.body;
      if (!conceptId) {
        return res.status(400).json({ message: "conceptId is required" });
      }
      const existing = await storage.getImplementationsByConceptId(conceptId);
      const previewOnly = existing.find((i) => !i.instructions || i.instructions.trim().length === 0);
      if (previewOnly && previewOnly.userId === userId) {
        return res.json(previewOnly);
      }
      const concept = await storage.getConceptById(conceptId);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const userConcepts = await storage.getConcepts(userId);
      const learnerProfile = await storage.getLatestLearnerProfile(userId);
      const preview = await generateImplementationPreview(
        concept,
        conversationHistory,
        userConcepts,
        learnerProfile?.profile || ""
      );
      const implementation = await storage.createImplementation({
        userId,
        conceptId,
        projectName: preview.projectName || `${concept.title} Project`,
        type: preview.type || "Application",
        tool: preview.tool || "Python",
        language: preview.language || "Python",
        components: preview.components || [],
        learningGoals: preview.learningGoals || [],
        problemAddressed: preview.problemAddressed || "",
        whySuggested: preview.whySuggested || "",
        realWorldContext: preview.realWorldContext || "",
        industry: preview.industry || "",
        instructions: "",
        code: "",
        pseudocode: "",
        flowDiagram: preview.flowDiagram || "",
        status: "preview"
      });
      res.status(201).json(implementation);
    } catch (error) {
      console.error("Implementation preview generation error:", error);
      res.status(500).json({ message: "Failed to generate implementation preview" });
    }
  });
  app2.get("/api/implementations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch implementation" });
    }
  });
  app2.get("/api/implementations/similar", async (req, res) => {
    try {
      const { type, tool, language, limit } = req.query;
      if (!type || !tool || !language) {
        return res.status(400).json({ message: "Missing required query parameters" });
      }
      const implementations2 = await storage.getSimilarImplementations(
        String(type),
        String(tool),
        String(language),
        limit ? parseInt(String(limit)) : 5
      );
      res.json(implementations2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch similar implementations" });
    }
  });
  app2.post("/api/implementations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const validated = insertImplementationSchema.parse({
        ...req.body,
        userId
      });
      const implementation = await storage.createImplementation(validated);
      res.status(201).json(implementation);
    } catch (error) {
      console.error("Implementation creation error:", error);
      res.status(400).json({ message: "Invalid implementation data" });
    }
  });
  app2.patch("/api/implementations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const implementation = await storage.updateImplementation(id, updates);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update implementation" });
    }
  });
  app2.post("/api/implementations/:id/regenerate-flow", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, req.user.id);
      if (!implementation) return res.status(404).json({ message: "Implementation not found" });
      const flowDiagram = await regenerateFlowDiagram({
        projectName: implementation.projectName,
        code: implementation.code,
        pseudocode: implementation.pseudocode,
        problemAddressed: implementation.problemAddressed
      });
      const updated = await storage.updateImplementation(id, { flowDiagram });
      res.json(updated);
    } catch (error) {
      console.error("Failed to regenerate flow diagram:", error);
      res.status(500).json({ message: "Failed to regenerate flow diagram" });
    }
  });
  app2.delete("/api/implementations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteImplementation(id);
      if (!success) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete implementation" });
    }
  });
  app2.post("/api/project-feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const metObjectives = req.body.metObjectives || [];
      const implementationId = req.body.implementationId;
      if (metObjectives.length > 0) {
        await storage.saveMasteredPrerequisites(
          metObjectives.map((obj) => ({
            userId,
            implementationId,
            prerequisite: String(obj)
          }))
        );
      }
      const validated = insertProjectFeedbackSchema.parse({
        ...req.body,
        userId
      });
      const feedback = await storage.createProjectFeedback(validated);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Feedback creation error:", error);
      res.status(400).json({ message: "Invalid feedback data" });
    }
  });
  app2.get("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const mastered = await storage.getUserMasteredPrerequisites(userId);
      res.json(mastered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mastered prerequisites" });
    }
  });
  async function getTrendImage(query) {
    try {
      const searchUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=${process.env.UNSPLASH_ACCESS_KEY || "YOUR_UNSPLASH_KEY"}`;
      return `https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(query)}`;
    } catch (e) {
      return null;
    }
  }
  app2.get("/api/trends", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const trends2 = await storage.getTrends(userId);
      res.json(trends2);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });
  app2.post("/api/trends/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const trends2 = await generateAndSaveTrends(userId);
      res.json(trends2);
    } catch (error) {
      console.error("Failed to generate trends:", error);
      res.status(500).json({ message: "Failed to generate trends" });
    }
  });
  app2.get("/api/insights/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const projects = await storage.getOpportunityProjects(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const feedback = await storage.getProjectFeedbackByUser(userId);
      const insights = await generateDynamicInsights(concepts2, projects, personalization, feedback);
      res.json(insights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });
  app2.patch("/api/trends/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const trend = await storage.updateTrend(id, updates);
      if (!trend) {
        return res.status(404).json({ message: "Trend not found" });
      }
      res.json(trend);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trend" });
    }
  });
  app2.get("/api/opportunity-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const projects = await storage.getOpportunityProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch opportunity projects" });
    }
  });
  app2.post("/api/opportunity-projects/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      console.log(`[DEBUG] Generating projects for user ${userId}`);
      const projects = await generateAndSaveProjects(userId);
      console.log(`[DEBUG] Successfully generated ${projects.length} projects`);
      res.status(201).json(projects);
    } catch (error) {
      console.error("Project generation error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate projects",
        stack: error instanceof Error ? error.stack : void 0
      });
    }
  });
  app2.post("/api/opportunity-projects/:id/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const projectId = parseInt(req.params.id);
      const { action } = req.body;
      const interaction = await storage.createProjectInteraction({
        userId,
        projectId,
        action
      });
      res.status(201).json(interaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });
  app2.get("/api/opportunity-projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });
  app2.delete("/api/opportunity-projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOpportunityProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });
  app2.post("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { prerequisite, implementationId } = req.body;
      const saved = await storage.saveMasteredPrerequisites([{
        userId,
        prerequisite,
        implementationId: implementationId || 0
      }]);
      res.status(201).json(saved[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to save mastered prerequisite" });
    }
  });
  app2.delete("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { prerequisite } = req.body;
      res.status(501).json({ message: "Not implemented" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete" });
    }
  });
  app2.get("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { conceptId, projectId, prerequisite } = req.query;
      let resources2;
      if (prerequisite) {
        resources2 = await storage.getResourcesByPrerequisite(userId, String(prerequisite));
        if (resources2.length === 0) {
          const { fetchResourcesForPrerequisite: fetchResourcesForPrerequisite3 } = await Promise.resolve().then(() => (init_resource_fetcher(), resource_fetcher_exports));
          const { scoreResources: scoreResources3 } = await Promise.resolve().then(() => (init_supabase_edge_functions(), supabase_edge_functions_exports));
          const rawResources = await fetchResourcesForPrerequisite3(String(prerequisite));
          if (rawResources.length > 0) {
            let scoredResources = rawResources;
            try {
              const scores = await scoreResources3(rawResources, String(prerequisite));
              if (Array.isArray(scores) && scores.length === rawResources.length) {
                scoredResources = rawResources.map((r, i) => ({
                  ...r,
                  relevanceScore: scores[i]?.relevanceScore ?? 70
                }));
              }
            } catch (scoreErr) {
              console.warn("Resource scoring failed, using unscored resources:", scoreErr);
              scoredResources = rawResources.map((r, i) => ({ ...r, relevanceScore: Math.max(50, 90 - i * 5) }));
            }
            scoredResources.sort((a, b) => {
              const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
              if (scoreDiff !== 0) return scoreDiff;
              if (a.type === "video" && b.type !== "video") return -1;
              if (b.type === "video" && a.type !== "video") return 1;
              return 0;
            });
            resources2 = await Promise.all(
              scoredResources.map(
                (resource) => storage.createResource({
                  userId,
                  conceptId: conceptId ? parseInt(String(conceptId)) : null,
                  projectId: projectId ? parseInt(String(projectId)) : null,
                  title: resource.title,
                  url: resource.url,
                  type: resource.type,
                  source: resource.source,
                  description: resource.snippet || resource.description || "",
                  relevanceScore: typeof resource.relevanceScore === "number" ? resource.relevanceScore <= 1 ? Math.round(resource.relevanceScore * 100) : Math.min(100, Math.round(resource.relevanceScore)) : 70,
                  prerequisite: String(prerequisite)
                })
              )
            );
          }
        }
      } else {
        resources2 = await storage.getResources();
      }
      res.json(resources2);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });
  app2.post("/api/resources/fetch", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { conceptId, projectId, title, prerequisites = [] } = req.body;
      if (!title || prerequisites.length === 0) {
        return res.status(400).json({ message: "Title and prerequisites are required" });
      }
      const { fetchResourcesForPrerequisites: fetchResourcesForPrerequisites2 } = await Promise.resolve().then(() => (init_resource_fetcher(), resource_fetcher_exports));
      const fetched = await fetchResourcesForPrerequisites2(prerequisites);
      const allResources = [];
      for (const [prereq, resources2] of Object.entries(fetched)) {
        for (const resource of resources2) {
          allResources.push({
            ...resource,
            prerequisite: prereq
          });
        }
      }
      const saved = await Promise.all(
        allResources.map(
          (resource) => storage.createResource({
            userId,
            conceptId: conceptId || null,
            projectId: projectId || null,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            source: resource.source,
            description: resource.snippet || "",
            relevanceScore: 100
            // Default high score for fetched resources
          })
        )
      );
      res.status(201).json(saved);
    } catch (error) {
      console.error("Resource fetch error:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });
  app2.get("/api/implementations/:id/suggestions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const excluded = req.query.excluded ? String(req.query.excluded).split(",") : [];
      const suggestions = await suggestToolAlternatives(
        implementation.tool,
        implementation.type || "general"
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });
  app2.post("/api/implementations/:id/convert", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const { targetLanguage } = req.body;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const converted = await convertImplementation(implementation, targetLanguage);
      const newVersion = await storage.createImplementation({
        userId,
        conceptId: implementation.conceptId,
        projectName: implementation.projectName,
        type: implementation.type,
        tool: targetLanguage,
        language: targetLanguage,
        problemAddressed: implementation.problemAddressed,
        whySuggested: implementation.whySuggested,
        realWorldContext: implementation.realWorldContext,
        industry: implementation.industry,
        instructions: converted.instructions,
        code: converted.code,
        pseudocode: converted.pseudocode,
        flowDiagram: converted.flowDiagram,
        status: "in_progress",
        // Converted projects should also be in_progress
        version: (implementation.version || 1) + 1,
        previousVersionId: implementation.id,
        imageUrl: implementation.imageUrl,
        components: implementation.components,
        learningGoals: implementation.learningGoals,
        expectedOutcomes: implementation.expectedOutcomes,
        requiredArtifacts: implementation.requiredArtifacts
      });
      res.status(201).json(newVersion);
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ message: "Failed to convert implementation" });
    }
  });
  app2.post("/api/implementations/:id/validate-tool", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { tool } = req.body;
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const result = await validateCustomTool(
        implementation.projectName,
        implementation.problemAddressed || "",
        tool
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate tool" });
    }
  });
  app2.post("/api/ai/analyze-knowledge-gaps", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const claimedKnowledge = await storage.getUserClaimedKnowledge(userId);
      const analysis = await analyzeKnowledgeGaps(concepts2, claimedKnowledge);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze knowledge gaps" });
    }
  });
  app2.post("/api/ai/generate-dynamic-insights", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const projects = await storage.getOpportunityProjects(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const insights = await generateDynamicInsights(concepts2, projects, personalization);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate dynamic insights" });
    }
  });
  app2.post("/api/ai/suggest-tools", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { currentTool, targetLanguage, projectType } = req.body;
      const suggestions = await suggestToolAlternatives(currentTool, targetLanguage, projectType);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to suggest tools" });
    }
  });
  app2.post("/api/ai/convert-implementation", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { implementation, targetType, targetTool, targetLanguage } = req.body;
      const converted = await convertImplementation(implementation, targetType, targetTool, targetLanguage);
      res.json(converted);
    } catch (error) {
      res.status(500).json({ message: "Failed to convert implementation" });
    }
  });
  app2.get("/api/user-claimed-knowledge", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const knowledge = await storage.getUserClaimedKnowledge(userId);
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claimed knowledge" });
    }
  });
  app2.post("/api/user-claimed-knowledge", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const knowledge = await storage.createUserClaimedKnowledge({
        ...req.body,
        userId
      });
      res.status(201).json(knowledge);
    } catch (error) {
      res.status(400).json({ message: "Invalid knowledge data" });
    }
  });
  app2.post("/api/implementations/:id/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const opportunity = await storage.getOpportunityProjectById(id, userId);
      let implementation;
      if (opportunity) {
        implementation = await storage.createImplementation({
          conceptId: opportunity.relatedConceptIds?.[0] || 0,
          userId,
          projectName: opportunity.title,
          type: "Implementation Project",
          tool: "General",
          language: "General",
          components: opportunity.skills || [],
          learningGoals: [opportunity.summary],
          status: "preview",
          code: "",
          whySuggested: "Converted from opportunity project"
        });
        await storage.updateOpportunityProject(opportunity.id, {
          recommendedImplementationId: implementation.id
        });
      } else {
        implementation = await storage.getImplementationById(id, userId);
      }
      if (!implementation) {
        return res.status(404).json({ message: "Implementation or Opportunity Project not found" });
      }
      const concept = await storage.getConceptById(implementation.conceptId);
      const effectiveConcept = concept || { id: implementation.conceptId, name: implementation.projectName, description: (implementation.learningGoals ?? [])[0] ?? "" };
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      (async () => {
        try {
          const result = await generateImplementationCode(
            effectiveConcept,
            implementation.type,
            implementation.tool,
            implementation.language
          );
          if (!result.code || result.code.trim().length < 50) {
            throw new Error("Generation produced empty or insufficient code content. Please try again.");
          }
          if (!result.instructions || result.instructions.trim().length < 20) {
            throw new Error("Generation produced empty or insufficient instructions. Please try again.");
          }
          await storage.updateImplementation(implementation.id, {
            instructions: result.instructions,
            code: result.code,
            pseudocode: result.pseudocode || "",
            flowDiagram: result.flowDiagram || "",
            status: "preview"
          });
          const { cleanupSSEClient: cleanupSSEClient3, isGenerationCanceled: isGenerationCanceled2, sendCompleted: sendCompleted2 } = await Promise.resolve().then(() => (init_sse_generator(), sse_generator_exports));
          if (isGenerationCanceled2(generationId)) {
            console.log(`[API] Generation ${generationId} was canceled before save, skipping update.`);
            return;
          }
          sendCompleted2(generationId, { implementationId: implementation.id });
          cleanupSSEClient3(generationId);
        } catch (error) {
          if (error instanceof Error && error.message === "CANCELED") {
            console.log(`[API] Generation ${generationId} stopped due to cancellation.`);
            return;
          }
          console.error("Background generation error:", error);
          try {
            await storage.updateImplementation(implementation.id, {
              status: "failed"
            });
          } catch (updateErr) {
            console.error("Failed to update implementation status to failed:", updateErr);
          }
          const { sendError: sendError2 } = await Promise.resolve().then(() => (init_sse_generator(), sse_generator_exports));
          sendError2(generationId, error instanceof Error ? error.message : "Unknown error");
        }
      })();
      res.json({ generationId });
    } catch (error) {
      console.error("Generation start error:", error);
      res.status(500).json({ message: "Failed to start generation" });
    }
  });
  app2.get("/api/implementations/:id/generate-stream/:genId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const genId = req.params.genId;
    registerSSEClient(genId, res);
  });
  app2.post("/api/implementations/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const { surveyData, feedback, masteredPrerequisites = [] } = req.body;
      await storage.updateImplementation(id, { status: "completed" });
      const allVersions = await storage.getProjectVersions(id);
      await Promise.all(
        allVersions.filter((v) => v.id !== id).map((v) => storage.updateImplementation(v.id, { status: "completed" }))
      );
      const finalFeedback = surveyData || feedback;
      if (finalFeedback) {
        await storage.createProjectFeedback({
          userId,
          implementationId: id,
          difficultyRating: finalFeedback.difficultyRating,
          enjoymentRating: finalFeedback.enjoymentRating || 3,
          metObjectives: finalFeedback.metObjectives,
          learntSkills: finalFeedback.learntSkills,
          outcomeMatches: finalFeedback.outcomeMatches,
          feedbackText: finalFeedback.feedbackText
        });
        const skills = finalFeedback.learntSkills || masteredPrerequisites;
        if (skills && skills.length > 0) {
          const prerequisites = skills.map((s) => ({
            userId,
            implementationId: id,
            prerequisite: s
          }));
          await storage.saveMasteredPrerequisites(prerequisites);
        }
      }
      res.json({ message: "Project marked as complete" });
    } catch (error) {
      console.error("Complete implementation error:", error);
      res.status(500).json({ message: "Failed to complete implementation" });
    }
  });
  app2.get("/api/implementations/:id/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${implementation.projectName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 20px; }
          .metadata { background: #f3f4f6; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          ul { margin-left: 20px; }
          pre { background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        </style>
        </head>
        <body>
          <h1>Project Report: ${implementation.projectName}</h1>
          <div class="metadata">
            <p><strong>Date:</strong> ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${implementation.status}</p>
            <p><strong>Tool/Language:</strong> ${implementation.tool} / ${implementation.language}</p>
          </div>

          <div class="section">
            <h2>Overview</h2>
            <p>${implementation.problemAddressed || "No overview provided."}</p>
          </div>

          <div class="section">
            <h2>Learning Goals</h2>
            <ul>
              ${implementation.learningGoals?.map((goal) => `<li>${goal}</li>`).join("") || "<li>No learning goals specified.</li>"}
            </ul>
          </div>

          <div class="section">
            <h2>Expected Outcomes</h2>
            <ul>
              ${implementation.expectedOutcomes?.map((outcome) => `<li>${outcome}</li>`).join("") || "<li>No outcomes specified.</li>"}
            </ul>
          </div>

          <div class="section">
            <h2>Instructions</h2>
            <div>${implementation.instructions?.replace(/\n/g, "<br>") || "Instructions not available."}</div>
          </div>

          <div class="section">
            <h2>Source Code</h2>
            <pre>${implementation.code || "Code not available."}</pre>
          </div>

          <p style="text-align: center; color: #666; font-size: 0.8em; margin-top: 50px;">
            Generated by Readiness Learning Platform
          </p>
        </body>
        </html>
      `;
      res.setHeader("Content-Type", "application/msword");
      res.setHeader("Content-Disposition", `attachment; filename="${implementation.projectName.toLowerCase().replace(/\s+/g, "_")}_report.doc"`);
      res.send(Buffer.from("\uFEFF" + htmlContent, "utf-8"));
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });
  app2.post("/api/project-preference-chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user.id;
      const { conceptTitle, conceptCategory, conversationHistory } = req.body;
      if (!conceptTitle || !conceptCategory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const personalization = await storage.getUserPersonalization(userId);
      const lastUserMessage = Array.isArray(conversationHistory) ? conversationHistory[conversationHistory.length - 1]?.content || "" : "";
      const result = await chatForProjectPreferences(conversationHistory, lastUserMessage);
      const extractedPreferences = result?.extractedPreferences || {
        preferredComplexity: null,
        preferredApproach: null,
        preferredTools: [],
        topicLean: null,
        additionalNotes: "",
        confidenceLevel: 0,
        isReadyToGenerate: false
      };
      if (extractedPreferences.isReadyToGenerate && extractedPreferences.confidenceLevel > 0.3) {
        const p = personalization;
        if (p) {
          const newPrefs = {
            ...extractedPreferences,
            confidenceLevel: Math.min(extractedPreferences.confidenceLevel * 0.6, 0.6)
          };
          delete newPrefs.isReadyToGenerate;
          await storage.updateUserPersonalization(p.id, {
            projectPreferences: newPrefs
          });
        }
      }
      res.json({
        reply: result?.response || result?.reply || "",
        extractedPreferences
      });
    } catch (error) {
      console.error("Project preference chat error:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });
  app2.get("/api/idea-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessions = await storage.getIdeaSessions(req.user.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch idea sessions" });
    }
  });
  app2.post("/api/idea-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { title, messages, ideaSummary, analysis, status, projectId } = req.body;
      const session3 = await storage.createIdeaSession({
        userId: req.user.id,
        title: title || "New Idea",
        messages: messages || [],
        ideaSummary: ideaSummary || null,
        analysis: analysis || null,
        status: status || "chatting",
        projectId: projectId || null
      });
      res.json(session3);
    } catch (error) {
      res.status(500).json({ message: "Failed to create idea session" });
    }
  });
  app2.patch("/api/idea-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateIdeaSession(id, req.body);
      if (!updated) return res.status(404).json({ message: "Session not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update idea session" });
    }
  });
  app2.delete("/api/idea-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIdeaSession(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete idea session" });
    }
  });
  app2.post("/api/ideas/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { messages, isRefining } = req.body;
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const history = messages || [];
      const lastMsg = history[history.length - 1]?.content || "";
      const ideaSummary = history.find((m) => m.role === "assistant")?.content || lastMsg;
      const result = await chatAboutIdea(ideaSummary, history, lastMsg);
      res.json({
        reply: result?.response || result?.reply || "",
        isReadyToAnalyze: result?.isReadyToAnalyze || false,
        ideaSummary: result?.ideaSummary
      });
    } catch (error) {
      console.error("Idea chat error:", error);
      res.status(500).json({ message: "Failed to process idea chat" });
    }
  });
  app2.post("/api/ideas/analyze", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { ideaSummary, chatHistory } = req.body;
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const raw = await analyzeIdeaReadiness(ideaSummary, chatHistory || []);
      const normalizeAlreadyHas = (items) => (items || []).map((it) => ({
        skill: it.skill || it.name || it.skillName || it.title || "",
        matchedConcept: it.matchedConcept || it.concept || it.matched || it.matchedSkill || it.via || ""
      })).filter((it) => it.skill);
      const normalizeMissing = (items) => (items || []).map((m) => ({
        skill: m.skill || m.name || m.skillName || m.title || "",
        importance: m.importance || m.priority || "helpful",
        resources: m.resources || m.links || []
      })).filter((m) => m.skill);
      let analysis = raw;
      if (!raw.projectName && (raw.project || raw.projectDetails)) {
        const p = raw.project || raw.projectDetails || {};
        analysis = {
          projectName: p.name || p.projectName || "Your Project",
          projectType: p.type || p.projectType || "Application",
          description: p.description || raw.description || "",
          difficulty: (p.difficulty || raw.difficulty || "intermediate").toLowerCase(),
          estimatedHours: p.estimatedHours || raw.estimatedHours || 8,
          requiredSkills: p.requiredSkills || raw.requiredSkills || [],
          alreadyHas: normalizeAlreadyHas(raw.alreadyHas || p.alreadyHas || []),
          missing: normalizeMissing(raw.missing || p.missing || []),
          readinessScore: raw.readinessScore ?? p.readinessScore ?? 50,
          summary: raw.summary || p.summary || ""
        };
      } else {
        analysis = {
          projectName: raw.projectName || "Your Project",
          projectType: raw.projectType || "Application",
          description: raw.description || "",
          difficulty: (raw.difficulty || "intermediate").toLowerCase(),
          estimatedHours: raw.estimatedHours || 8,
          requiredSkills: raw.requiredSkills || [],
          alreadyHas: normalizeAlreadyHas(raw.alreadyHas || []),
          missing: normalizeMissing(raw.missing || []),
          readinessScore: raw.readinessScore ?? 50,
          summary: raw.summary || ""
        };
      }
      const missingWithoutResources = analysis.missing.filter((m) => (m.resources?.length ?? 0) === 0);
      if (missingWithoutResources.length > 0) {
        const fetchedMap = await fetchResourcesForPrerequisites(
          missingWithoutResources.map((m) => m.skill)
        );
        analysis.missing = analysis.missing.map((m) => {
          if ((m.resources?.length ?? 0) > 0) return m;
          const fetched = fetchedMap[m.skill] || [];
          const topResources = fetched.slice(0, 3).map((r) => ({
            type: r.type,
            title: r.title,
            url: r.url
          }));
          return { ...m, resources: topResources };
        });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Idea analysis error:", error);
      res.status(500).json({ message: "Failed to analyze idea" });
    }
  });
  app2.post("/api/ideas/create-project", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { analysis } = req.body;
      const userId = req.user.id;
      const concepts2 = await storage.getConcepts(userId);
      const conceptIds = concepts2.slice(0, 2).map((c) => c.id);
      const rawHours = analysis.estimatedHours;
      const estimatedHours = (() => {
        if (typeof rawHours === "number") return Math.round(rawHours);
        if (typeof rawHours === "string") {
          const firstNum = parseInt(rawHours.split(/[-–,]/)[0].trim(), 10);
          return isNaN(firstNum) ? 8 : firstNum;
        }
        return 8;
      })();
      const project = await storage.createOpportunityProject({
        userId,
        title: analysis.projectName,
        summary: analysis.description,
        difficulty: (analysis.difficulty || "intermediate").toLowerCase(),
        estimatedHours,
        skills: analysis.requiredSkills || [],
        relatedConceptIds: conceptIds,
        recommendedImplementationId: null,
        locationContext: null,
        problemType: "idea-driven"
      });
      res.json({ projectId: project.id });
    } catch (error) {
      console.error("Idea create project error:", error);
      res.status(500).json({ message: "Failed to create project from idea" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  // BASE_PATH="./" when building for Electron (file:// loads need relative paths)
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets")
    },
    // Force a single copy of React and React Query across all workspace packages.
    // Without this, the pnpm workspace can resolve two separate instances — one
    // from the root node_modules and one from a package's own node_modules —
    // which causes "Invalid hook call" and "Cannot read properties of null
    // (reading 'useContext')" errors.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query"
    ]
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    allowedHosts: true,
    fs: {
      strict: false
    }
  },
  optimizeDeps: {
    // Pre-bundle these together so the optimizer never splits them across
    // separate chunks (which is another source of the duplicate-React problem).
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query"
    ]
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_supabase_edge_functions();

// server/auth/index.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { randomBytes } from "crypto";

// server/auth/supabase.ts
import { createClient as createClient3 } from "@supabase/supabase-js";
var SUPABASE_URL4 = "https://hzhweoiwfldtmwphdkzr.supabase.co";
var SUPABASE_ANON_KEY2 = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHdlb2l3ZmxkdG13cGhka3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODk4NjgsImV4cCI6MjA5NTc2NTg2OH0.XNoUCjNM0-Wf4eYdPjVy3w3qHBNReE6RLOIY-K9TfIk";
var supabaseAuth = createClient3(SUPABASE_URL4, SUPABASE_ANON_KEY2, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
async function verifySupabaseToken(token) {
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

// server/auth/index.ts
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "stable-session-secret-123",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      sameSite: "lax",
      httpOnly: true,
      path: "/"
    }
  };
  if (app2.get("env") === "production") {
    app2.set("trust proxy", 1);
  }
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  app2.use(async (req, res, next) => {
    const token = getTokenFromHeader(req);
    if (token) {
      try {
        const supabaseUser = await verifySupabaseToken(token);
        if (supabaseUser) {
          req.supabaseUser = supabaseUser;
        }
      } catch {
      }
    }
    next();
  });
  app2.use(async (req, res, next) => {
    if (req.supabaseUser && !req.isAuthenticated()) {
      try {
        let dbUser = await storage.getUserByEmail(req.supabaseUser.email);
        if (!dbUser) {
          const username = req.supabaseUser.user_metadata?.username || req.supabaseUser.email?.split("@")[0] || `user_${Date.now()}`;
          dbUser = await storage.createUser({
            id: req.supabaseUser.id,
            username,
            email: req.supabaseUser.email,
            password: randomBytes(32).toString("hex")
          });
          try {
            await storage.createUserPersonalization({
              userId: dbUser.id,
              careerGoals: [],
              skillsFocus: [],
              preferredVoice: "",
              theme: "system",
              currentCareer: null,
              aspiringCareer: null,
              desiredRole: null,
              targetIndustry: null,
              yearsOfExperience: null,
              location: null,
              locationLastUpdated: null
            });
            await storage.createUserSettings({
              userId: dbUser.id,
              enableConceptCountGeneration: true,
              enableDailyGeneration: true,
              conceptCountThreshold: 3,
              dailyGenerationFrequencyDays: 1
            });
          } catch {
          }
        }
        if (dbUser) {
          req.user = dbUser;
          req.isAuthenticated = () => true;
        }
      } catch {
      }
    }
    next();
  });
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const dbUser = await storage.getUserByUsername(username);
        if (!dbUser) {
          return done(null, false, { message: "Incorrect username." });
        }
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email: dbUser.email,
          password
        });
        if (error || !data.user) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, dbUser);
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password || !email) {
        return res.status(400).send("Username, password, and email are required");
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).send("Email already exists");
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username }
      });
      if (authError || !authData.user) {
        return res.status(400).send(authError?.message || "Failed to create auth user");
      }
      const user = await storage.createUser({
        id: authData.user.id,
        username,
        email,
        password
      });
      try {
        await storage.createUserPersonalization({
          userId: user.id,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null
        });
        await storage.createUserSettings({
          userId: user.id,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1
        });
      } catch (initErr) {
        console.error("Failed to initialize user data:", initErr);
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (req.supabaseUser) {
      return res.json({
        id: req.supabaseUser.id,
        email: req.supabaseUser.email,
        username: req.supabaseUser.user_metadata?.username || req.supabaseUser.email?.split("@")[0] || "User",
        avatarUrl: req.supabaseUser.user_metadata?.avatar_url
      });
    }
    if (req.isAuthenticated()) return res.json(req.user);
    return res.status(401).json({ message: "Unauthorized" });
  });
}

// server/index.ts
process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL: Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("CRITICAL: Uncaught Exception thrown:", err);
  process.exit(1);
});
var app = express2();
app.use(express2.json({
  limit: "50mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ limit: "50mb", extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    validateAIServices();
  } catch (e) {
    console.error("AI Service validation failed:", e);
  }
  setupAuth(app);
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
//# sourceMappingURL=index.mjs.map
