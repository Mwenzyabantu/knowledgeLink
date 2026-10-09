import { getSupabaseClient } from "./supabase-context";

type AIFunction = "ai-generate" | "ai-chat" | "ai-insights";

async function invokeAI<T>(
  endpoint: AIFunction,
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await getSupabaseClient().functions.invoke(endpoint, {
    body: { action, ...payload },
  });

  if (error) {
    let detail = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const responseBody = await context
        .clone()
        .json()
        .catch(() => null) as { error?: string; message?: string } | null;
      detail = responseBody?.error || responseBody?.message || detail;
    }
    throw new Error(`Supabase AI ${endpoint}/${action} failed: ${detail}`);
  }

  return data as T;
}

export function extractValidJSON(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const object = cleaned.match(/\{[\s\S]*\}/);
    const array = cleaned.match(/\[[\s\S]*\]/);
    const candidate = object?.[0] || array?.[0];
    if (!candidate) throw new Error("The AI response did not contain valid JSON.");
    return JSON.parse(candidate);
  }
}

export interface ResourceResult {
  title: string;
  url?: string;
  type?: string;
  source?: string;
  description?: string;
  snippet?: string;
  relevanceScore?: number;
  relevanceReason?: string;
}

export interface ImplementationPreview {
  projectName: string;
  type: string;
  tool: string;
  language: string;
  components: string[];
  learningGoals: string[];
  problemAddressed: string;
  whySuggested: string;
  realWorldContext: string;
  industry: string;
  flowDiagram: string;
  [key: string]: unknown;
}

export interface TrendContent {
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  relevanceToUser: string;
  relatedConcepts: string[];
  category: string;
  imageUrl?: string | null;
}

export interface DynamicLearningInsights {
  learnerProfile?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  suggestedNextTopics?: string[];
  engagementScore?: number;
}

export async function generate5WH(userInput: string): Promise<Record<string, unknown>> {
  return invokeAI("ai-generate", "generate5WH", { input: userInput });
}

export async function generateInlinePrompt(
  userInput: string,
  previousPrompts: string[] = [],
  recentTyping = "",
): Promise<string> {
  return invokeAI("ai-generate", "generateInlinePrompt", {
    concept: { title: userInput, originalInput: userInput },
    chatHistory: [
      ...previousPrompts.map((content) => ({ role: "assistant", content })),
      ...(recentTyping ? [{ role: "user", content: recentTyping }] : []),
    ],
  });
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = [],
  conceptContext?: string,
): Promise<string> {
  const result = await invokeAI<{ response: string }>(
    "ai-chat",
    "generateChatResponse",
    {
      lastMessage: userMessage,
      chatHistory: conversationHistory,
      concept: conceptContext ? { context: conceptContext } : undefined,
    },
  );
  return result.response;
}

export async function generateTags(conversationContent: string): Promise<string[]> {
  return invokeAI("ai-generate", "generateTags", { content: conversationContent });
}

export async function generateImplementationPreview(
  concept: Record<string, unknown>,
  historyOrProjectTitle: unknown = [],
  userConceptsOrDifficulty: unknown = [],
  learnerProfile = "",
): Promise<ImplementationPreview> {
  const conversationHistory = Array.isArray(historyOrProjectTitle)
    ? historyOrProjectTitle
    : [];
  const projectTitle = typeof historyOrProjectTitle === "string"
    ? historyOrProjectTitle
    : undefined;
  const userConcepts = Array.isArray(userConceptsOrDifficulty)
    ? userConceptsOrDifficulty
    : [];
  const difficulty = typeof userConceptsOrDifficulty === "string"
    ? userConceptsOrDifficulty
    : undefined;

  return invokeAI("ai-generate", "generateImplementationPreview", {
    concept,
    conversationHistory,
    userConcepts,
    learnerProfile,
    projectTitle,
    difficulty,
  });
}

export async function generateImplementationCode(
  concept: Record<string, unknown>,
  preview: Record<string, unknown>,
  chatHistory: unknown[] = [],
  generationId?: string,
  previousProjectContext?: unknown,
): Promise<Record<string, any>> {
  const generated = await invokeAI<Record<string, unknown>>(
    "ai-generate",
    "generateImplementationCode",
    {
      concept,
      projectType: preview.type || preview.projectType || "Application",
      tool: preview.tool || "Choose an appropriate tool",
      language: preview.language || "Choose an appropriate language",
      template: { ...preview, chatHistory, generationId, previousProjectContext },
    },
  );

  return {
    ...generated,
    projectName: preview.projectName || preview.title,
    type: preview.type || preview.projectType,
    tool: preview.tool,
    language: preview.language,
  };
}

export async function generateOpportunityProjects(
  concepts: unknown[],
  location?: string,
  careerGoals?: string[],
  complexity = "same",
  referenceProject?: unknown,
): Promise<Record<string, any>[]> {
  return invokeAI("ai-insights", "generateOpportunityProjects", {
    concepts,
    location,
    careerGoals,
    complexity,
    referenceProject,
  });
}

export async function generateTrendContent(
  concepts: Record<string, any>[],
  personalization?: Record<string, unknown>,
): Promise<TrendContent[]> {
  if (concepts.length === 0) return [];

  const categories = Array.from(
    new Set(concepts.map((concept) => concept.category).filter(Boolean)),
  );
  const result = await invokeAI<TrendContent | TrendContent[]>(
    "ai-insights",
    "generateTrendContent",
    {
      conceptTitles: concepts.map((concept) => concept.title).filter(Boolean),
      category: categories.join(", ") || "Education and technology",
      personalization,
    },
  );
  return Array.isArray(result) ? result : [result];
}

export async function analyzeKnowledgeGaps(
  concepts: unknown[],
): Promise<Record<string, unknown>> {
  if (concepts.length === 0) {
    return { gaps: [], learningPattern: "", opportunityProjects: [] };
  }
  return invokeAI("ai-insights", "analyzeKnowledgeGaps", {
    concepts,
    completedProjects: [],
  });
}

export async function generateLearnerProfile(concepts: unknown[]): Promise<string> {
  if (concepts.length === 0) return "New learner with no prior knowledge.";
  const result = await invokeAI<{ learnerProfile?: string }>(
    "ai-insights",
    "generateDynamicInsights",
    { concepts, feedback: [] },
  );
  return result.learnerProfile || "";
}

export async function generateDynamicInsights(
  concepts: Array<{ title: string; category: string }>,
): Promise<DynamicLearningInsights> {
  return invokeAI<DynamicLearningInsights>("ai-insights", "generateDynamicInsights", {
    concepts,
    feedback: [],
  });
}

async function invokeResourceScoring(
  concept: string,
  resources: ResourceResult[],
): Promise<ResourceResult[]> {
  if (resources.length === 0) return [];
  const scores = await invokeAI<
    { relevanceScore: number; relevanceReason: string }[]
  >("ai-insights", "scoreResources", { resources, concept });
  return resources.map((resource, index) => ({
    ...resource,
    ...scores[index],
  }));
}

export async function rankResourcesRelevance(
  conceptTitle: string,
  resources: ResourceResult[],
): Promise<ResourceResult[]> {
  return invokeResourceScoring(conceptTitle, resources);
}

export async function generateResourceQueries(
  conceptTitle: string,
  category: string,
): Promise<string[]> {
  return invokeAI("ai-insights", "generateResourceQueries", {
    concept: conceptTitle,
    category,
  });
}

export async function suggestToolAlternatives(
  projectName: string,
  problemAddressed: string,
  industry: string,
  currentLanguage: string,
  excludedLanguages: string[] = [],
): Promise<string[]> {
  const suggestions = await invokeAI<
    { tool: string; reason?: string }[]
  >("ai-insights", "suggestToolAlternatives", {
    projectName,
    problemAddressed,
    industry,
    currentLanguage,
    excludedLanguages,
    tool: currentLanguage,
    projectType: projectName,
  });
  return suggestions.map((suggestion) => suggestion.tool).filter(Boolean);
}

export async function convertImplementation(
  implementation: Record<string, any>,
  targetLanguage: string,
): Promise<Record<string, unknown>> {
  const result = await invokeAI<{
    convertedCode: string;
    pseudocode: string;
    notes: string[];
  }>("ai-insights", "convertImplementation", {
    code: implementation.code || "",
    fromTool: implementation.tool || implementation.language || "Unknown",
    fromLanguage: implementation.language || "Unknown",
    toTool: targetLanguage,
    toLanguage: targetLanguage,
  });

  return {
    ...result,
    code: result.convertedCode,
    language: targetLanguage,
    instructions: result.notes?.join("\n") || "",
    flowDiagram: implementation.flowDiagram || "",
  };
}

export async function validateCustomTool(
  projectName: string,
  problemAddressed: string,
  tool: string,
): Promise<{ valid: boolean; reason?: string }> {
  const result = await invokeAI<{
    valid: boolean;
    reasoning?: string;
  }>("ai-insights", "validateCustomTool", {
    tool,
    language: "unspecified",
    projectType: `${projectName}: ${problemAddressed}`,
  });
  return { valid: result.valid, reason: result.reasoning };
}

export async function filterOutMasteredPrerequisites(
  allPrerequisites: string[],
  masteredPrerequisites: string[],
): Promise<string[]> {
  if (masteredPrerequisites.length === 0 || allPrerequisites.length === 0) {
    return allPrerequisites;
  }
  const result = await invokeAI<{ filtered: string[] }>(
    "ai-insights",
    "filterOutMasteredPrerequisites",
    {
      newPrerequisites: allPrerequisites,
      masteredSkills: masteredPrerequisites,
    },
  );
  return result.filtered;
}

export async function selectBestProjectTemplate(
  concept: Record<string, any>,
  preview: Record<string, any>,
  candidateProjects: Record<string, any>[],
): Promise<Record<string, any> | null> {
  if (candidateProjects.length === 0) return null;
  const result = await invokeAI<{
    selectedProject?: { name?: string; projectName?: string };
  }>("ai-insights", "selectBestProjectTemplate", {
    candidates: candidateProjects,
    targetType: preview.type || preview.projectType || "Application",
    targetTool: preview.tool || "Unknown",
    targetLanguage: preview.language || "Unknown",
    concept,
  });
  const name = result.selectedProject?.name || result.selectedProject?.projectName;
  return candidateProjects.find(
    (project) => project.projectName === name || project.name === name,
  ) || null;
}

export async function scoreResources(
  prerequisite: string,
  resources: ResourceResult[],
): Promise<ResourceResult[]> {
  return invokeResourceScoring(prerequisite, resources);
}
