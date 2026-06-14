/**
 * AI function layer — all calls go to Supabase Edge Functions.
 *
 * The Gemini and Groq API keys live in Supabase Secrets, not in Replit.
 * Every AI function here proxies to the appropriate deployed edge function.
 *
 * Edge functions:
 *   ai-generate  → generate5WH, generateImplementationPreview,
 *                  generateImplementationCode, generateInlinePrompt, generateTags
 *   ai-chat      → generateChatResponse, chatForProjectPreferences,
 *                  chatAboutIdea, analyzeIdeaReadiness
 *   ai-insights  → generateTrendContent, generateOpportunityProjects,
 *                  analyzeKnowledgeGaps, generateDynamicInsights,
 *                  suggestToolAlternatives, filterOutMasteredPrerequisites,
 *                  selectBestProjectTemplate, convertImplementation,
 *                  validateCustomTool, regenerateFlowDiagram,
 *                  scoreResources, generateResourceQueries, fetchYouTubeVideos
 */

import { SUPABASE_ANON_KEY as HARDCODED_ANON_KEY } from "./supabase";

const SUPABASE_URL = "https://hzhweoiwfldtmwphdkzr.supabase.co/functions/v1";

function getAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || HARDCODED_ANON_KEY;
}

async function callEdge(fn: string, action: string, data: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAnonKey()}`,
    },
    body: JSON.stringify({ action, ...data }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge function ${fn}/${action} failed: ${res.status} ${text.slice(0, 300)}`);
  }

  return res.json();
}

// ─── ai-generate ──────────────────────────────────────────────────────────

export async function generate5WH(input: string) {
  return callEdge("ai-generate", "generate5WH", { input });
}

export async function generateImplementationPreview(
  concept: any,
  conversationHistory: { role: string; content: string }[] = [],
  userConcepts: any[] = [],
  learnerProfile = ""
) {
  return callEdge("ai-generate", "generateImplementationPreview", {
    concept,
    conversationHistory,
    userConcepts,
    learnerProfile,
  });
}

export async function generateImplementationCode(
  concept: any,
  projectType: string,
  tool: string,
  language: string,
  template?: any
) {
  return callEdge("ai-generate", "generateImplementationCode", {
    concept,
    projectType,
    tool,
    language,
    template,
  });
}

export async function generateInlinePrompt(
  userInput: string,
  previousPrompts: string[] = [],
  recentTyping?: string
) {
  // Edge function expects: concept (string), chatHistory (array)
  const chatHistory = [
    ...previousPrompts.map(p => ({ role: "user", content: p })),
    ...(recentTyping ? [{ role: "user", content: recentTyping }] : []),
  ];
  return callEdge("ai-generate", "generateInlinePrompt", {
    concept: userInput,
    chatHistory,
  });
}

// ─── ai-chat ──────────────────────────────────────────────────────────────

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  conceptContext?: string
) {
  // Edge function expects: lastMessage, chatHistory, concept
  const result = await callEdge("ai-chat", "generateChatResponse", {
    lastMessage: userMessage,
    chatHistory: conversationHistory,
    concept: conceptContext,
  });
  return result?.response ?? result;
}

export async function generateTags(conversationContent: string): Promise<string[]> {
  const result = await callEdge("ai-chat", "generateTags", {
    content: conversationContent,
  });
  return Array.isArray(result) ? result : result?.tags ?? [];
}

export async function chatForProjectPreferences(
  conversationHistory: any[],
  userMessage: string
) {
  return callEdge("ai-chat", "chatForProjectPreferences", {
    conversation: conversationHistory,
    lastMessage: userMessage,
  });
}

export async function chatAboutIdea(
  ideaSummary: string,
  conversationHistory: any[],
  userMessage: string
) {
  return callEdge("ai-chat", "chatAboutIdea", {
    ideaSummary,
    conversation: conversationHistory,
    lastMessage: userMessage,
  });
}

export async function analyzeIdeaReadiness(idea: any, conversationHistory: any[]) {
  return callEdge("ai-chat", "analyzeIdeaReadiness", {
    idea,
    conversation: conversationHistory,
  });
}

// ─── ai-insights ──────────────────────────────────────────────────────────

export async function generateTrendContent(
  conceptTitles: string[],
  category: string,
  recent?: string[]
) {
  return callEdge("ai-insights", "generateTrendContent", {
    conceptTitles,
    category,
    recent,
  });
}

export async function generateOpportunityProjects(
  concepts: any[],
  userLocation?: string,
  userGoals?: string[],
  userIdeas?: string[]
) {
  // Edge function expects: concepts, location, careerGoals, ideaTitles
  return callEdge("ai-insights", "generateOpportunityProjects", {
    concepts,
    location: userLocation,
    careerGoals: userGoals,
    ideaTitles: userIdeas,
  });
}

export async function analyzeKnowledgeGaps(concepts: any[], completedProjects: any[]) {
  return callEdge("ai-insights", "analyzeKnowledgeGaps", {
    concepts,
    completedProjects,
  });
}

export async function generateDynamicInsights(
  concepts: any[],
  projects: any[],
  personalization?: any,
  feedback?: any[]
) {
  return callEdge("ai-insights", "generateDynamicInsights", {
    concepts,
    projects,
    personalization,
    feedback: feedback || [],
  });
}

export async function suggestToolAlternatives(
  tool: string,
  projectType?: string,
  language?: string
) {
  return callEdge("ai-insights", "suggestToolAlternatives", {
    tool,
    projectType: projectType || "general",
    language,
  });
}

export async function filterOutMasteredPrerequisites(
  newPrerequisites: string[],
  masteredSkills: string[]
) {
  return callEdge("ai-insights", "filterOutMasteredPrerequisites", {
    newPrerequisites,
    masteredSkills,
  });
}

export async function selectBestProjectTemplate(
  candidates: any[],
  targetType: string,
  targetTool: string,
  targetLanguage: string
) {
  return callEdge("ai-insights", "selectBestProjectTemplate", {
    candidates,
    targetType,
    targetTool,
    targetLanguage,
  });
}

export async function convertImplementation(
  implementation: any,
  targetType?: string,
  targetTool?: string,
  targetLanguage?: string
) {
  // Edge function expects: code, fromTool, fromLanguage, toTool, toLanguage
  return callEdge("ai-insights", "convertImplementation", {
    code: implementation?.code || "",
    fromTool: implementation?.tool || "",
    fromLanguage: implementation?.language || "",
    toTool: targetTool || targetLanguage || "",
    toLanguage: targetLanguage || targetTool || "",
  });
}

export async function validateCustomTool(
  tool: string,
  language: string,
  projectType: string
) {
  return callEdge("ai-insights", "validateCustomTool", {
    tool,
    language,
    projectType,
  });
}

export async function regenerateFlowDiagram(implementation: any) {
  return callEdge("ai-insights", "regenerateFlowDiagram", { implementation });
}

export async function scoreResources(resources: any[], concept: string) {
  return callEdge("ai-insights", "scoreResources", { resources, concept });
}

export async function generateResourceQueries(
  concept: string,
  category?: string,
  context?: string
): Promise<string[]> {
  const result = await callEdge("ai-insights", "generateResourceQueries", {
    concept,
    category: category || "",
    context: context || "",
  });
  return Array.isArray(result) ? result : result?.queries ?? [];
}

export async function fetchYouTubeVideos(
  queries: string[],
  maxPerQuery = 3
): Promise<any[]> {
  const result = await callEdge("ai-insights", "fetchYouTubeVideos", {
    queries,
    maxPerQuery,
  });
  return result?.videos ?? (Array.isArray(result) ? result : []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function extractValidJSON(text: string): any {
  text = text.trim();
  const startIdx = text.indexOf("{");
  if (startIdx === -1) throw new Error("No JSON object found in response");
  let braceCount = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === "\\") { escapeNext = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      if (braceCount === 0) { endIdx = i; break; }
    }
  }
  if (endIdx === -1) throw new Error("No complete JSON object found in response");
  return JSON.parse(text.slice(startIdx, endIdx + 1));
}

export function validateAIServices(): void {
  const anonKey = getAnonKey();
  if (anonKey) {
    console.log("✓ Supabase Edge Functions: connected (all AI calls routed through Supabase)");
  } else {
    console.warn("⚠️  Supabase anon key not found — AI calls will fail.");
  }
}
