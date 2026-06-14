import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// Rate-limit-aware sleep helper
// Gemini free tier: 15 RPM → 1 request every ~4 s
// Groq free tier (llama-3.3-70b): ~6 000 TPM → ~12 s between heavy calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Delays tuned for free-tier limits
const GEMINI_INTER_CALL_DELAY_MS = 5000;  // 5 s between Gemini requests  (safe for 15 RPM)
const GROQ_INTER_CALL_DELAY_MS   = 12000; // 12 s before large Groq calls  (safe for low TPM)

/**
 * Wraps any async AI call with automatic rate-limit retry logic.
 * - On a 429 / 413 rate-limit error it reads the `retry-after` response header
 *   (or defaults to 60 s) and waits that long before retrying.
 * - Retries up to `maxRetries` times before re-throwing.
 */
async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 4,
  sendDetail?: (msg: string) => void,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;

      // Detect rate-limit errors from Groq (413/429) and Gemini (RESOURCE_EXHAUSTED)
      const status = err?.status ?? err?.statusCode ?? 0;
      const errCode: string = err?.error?.error?.code ?? err?.error?.code ?? err?.code ?? "";
      const errMsg: string = err?.message ?? "";
      const isRateLimit =
        status === 429 ||
        status === 413 ||
        errCode === "rate_limit_exceeded" ||
        errMsg.includes("rate_limit_exceeded") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("Request too large");

      if (!isRateLimit || attempt > maxRetries) throw err;

      // Read retry-after header if present, otherwise wait 60 s
      const retryAfterRaw = err?.headers?.["retry-after"] ?? err?.headers?.["Retry-After"] ?? null;
      const retryAfterSec = retryAfterRaw ? Math.ceil(parseFloat(retryAfterRaw)) + 3 : 62;
      const waitMs = retryAfterSec * 1000;

      console.warn(
        `[Rate Limit] ${label} hit rate limit (attempt ${attempt}/${maxRetries}). ` +
        `Waiting ${retryAfterSec}s before retry…`
      );
      if (sendDetail) {
        sendDetail(`Rate limit reached — waiting ${retryAfterSec}s before retry ${attempt}/${maxRetries}…`);
      }
      await sleep(waitMs);
    }
  }
}

// Initialize AI clients with validation logging
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const groqApiKey = process.env.GROQ_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: geminiApiKey });
const groq = new Groq({ apiKey: groqApiKey });

// Validate AI services on startup
export function validateAIServices(): void {
  console.log("🔍 AI Services Validation:");
  console.log(
    `✓ Gemini API Key: ${geminiApiKey ? "✅ Configured" : "❌ MISSING - Groq will be used as primary"}`,
  );
  console.log(
    `✓ Groq API Key: ${groqApiKey ? "✅ Configured" : "❌ MISSING - No fallback available"}`,
  );

  if (!geminiApiKey) {
    console.warn(
      "⚠️  WARNING: Gemini API key not found. All Gemini calls will fall back to Groq.",
    );
  }
}

/**
 * Safely extract and validate JSON from text
 * Uses bracket counting to find complete JSON objects
 * Also handles malformed JSON with unescaped newlines
 */
export function extractValidJSON(text: string): any {
  text = text.trim();

  // Find first opening brace
  const startIdx = text.indexOf("{");
  if (startIdx === -1) {
    throw new Error("No JSON object found in response");
  }

  // Count brackets to find matching closing brace
  let braceCount = 0;
  let endIdx = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    // Handle escape sequences
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    // Track if we're inside a string
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    // Count braces only outside of strings
    if (!inString) {
      if (char === "{") braceCount++;
      else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }

  if (endIdx === -1) {
    throw new Error("Incomplete JSON object - unmatched braces");
  }

  let jsonStr = text.substring(startIdx, endIdx);

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    // Try to fix common malformed JSON issues: unescaped newlines in strings
    console.warn("Initial JSON parse failed, attempting to repair...");

    // Replace literal newlines and control characters inside strings with escaped versions
    jsonStr = jsonStr.replace(/"([^"\\]|\\.)*"/g, (match) => {
      return match
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/[\x00-\x1F]/g, (c) => {
          const esc: Record<string, string> = {
            "\b": "\\b",
            "\f": "\\f",
            "\n": "\\n",
            "\r": "\\r",
            "\t": "\\t",
          };
          return esc[c] || "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
        });
    });

    // Fix unescaped triple quotes which sometimes happen in AI responses for code
    jsonStr = jsonStr.replace(/"""/g, '\\"\\"\\"');

    // Fix missing closing quotes or braces at the end if truncated
    if (!jsonStr.trim().endsWith('}') && !jsonStr.trim().endsWith(']')) {
      if (inString) jsonStr += '"';
      while (braceCount > 0) {
        jsonStr += '}';
        braceCount--;
      }
    }

    try {
      console.log("Successfully repaired JSON");
      return JSON.parse(jsonStr);
    } catch (retryError) {
      console.error(
        "JSON parse error. Attempted to parse:",
        jsonStr.substring(0, 300) + "...",
      );
      throw retryError;
    }
  }
}

/**
 * Score and rank resources by relevance to a specific prerequisite
 * Uses AI to evaluate how well each resource matches the learning need
 */
export async function scoreResources(
  prerequisite: string,
  resources: any[],
): Promise<any[]> {
  if (resources.length === 0) return [];

  try {
    const resourceDescriptions = resources
      .map(
        (r, i) =>
          `${i + 1}. "${r.title}" (${r.type} from ${r.source})${r.snippet ? ": " + r.snippet : ""}`,
      )
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `For the prerequisite: "${prerequisite}"

Rate each resource by relevance (0-1 scale). Return ONLY a JSON array of numbers, one per resource, in the same order.

Resources:
${resourceDescriptions}

Example response: [0.95, 0.7, 0.5]`,
            },
          ],
        },
      ],
    });

    const content = response.candidates?.[0]?.content?.parts?.[0];
    if (!content || !("text" in content)) {
      console.warn("No scoring response from AI");
      // Return resources with default scores if AI fails
      return resources.map((r, i) => ({ ...r, relevanceScore: 1 - i * 0.1 }));
    }

    try {
      const scores = JSON.parse(content.text || "[]");
      return resources.map((resource, index) => ({
        ...resource,
        relevanceScore: scores[index] ?? 0.5,
      }));
    } catch {
      // If parsing fails, assign descending scores
      return resources.map((resource, index) => ({
        ...resource,
        relevanceScore: Math.max(0, 1 - index * 0.15),
      }));
    }
  } catch (error) {
    console.error("AI resource scoring failed:", error);
    // Fallback: assign descending scores
    return resources.map((resource, index) => ({
      ...resource,
      relevanceScore: Math.max(0, 1 - index * 0.15),
    }));
  }
}

export interface LearningInsight {
  pattern: string;
  insight: string;
}

export interface LearningInsightsResult {
  patterns: LearningInsight[];
  suggestions: string[];
  subjectDistribution: { subject: string; count: number; percent: number }[];
}

export async function generateDynamicInsights(
  concepts: any[],
  implementations: any[],
  feedback: any[]
): Promise<LearningInsightsResult> {
  if (concepts.length === 0) {
    return {
      patterns: [{ pattern: "Getting Started", insight: "Start learning concepts to see your patterns emerge." }],
      suggestions: ["Add your first concept to get personalized suggestions."],
      subjectDistribution: []
    };
  }

  const systemPrompt = `You are an expert learning psychologist and data analyst.
Analyze the person's learning history, projects, and feedback to identify deep patterns in how they learn and solve problems.

Avoid obvious statements. The insights should sound like a natural observation from someone who has been watching their journey unfold from afar. 
Instead of "The user" or "The learner", use phrasing like "You tend to...", "Your approach shows...", or describe the observations directly as if speaking to them or about their natural process.

Look for:
1. Cognitive preferences (e.g., theory-first vs. application-first).
2. Cross-disciplinary synthesis (how they bridge different subjects).
3. Implementation style (e.g., focus on optimization, readability, or rapid prototyping).
4. Feedback-driven growth (how they respond to challenges).

Return valid JSON in this exact format:
{
  "patterns": [
    { "pattern": "Name of Pattern", "insight": "Deep analysis of why this exists in their data, written in a natural, observational tone" }
  ],
  "suggestions": ["Specific, non-obvious next step 1", "Next step 2"],
  "subjectDistribution": [
    { "subject": "Subject Name", "count": number_of_concepts, "percent": percentage_of_total }
  ]
}`;

  const historyData = {
    concepts: concepts.map(c => ({ title: c.title, category: c.category, problem: c.problem })),
    implementations: implementations.map(i => ({ name: i.projectName, type: i.type, tool: i.tool })),
    feedback: Array.isArray(feedback) ? feedback.map(f => ({ difficulty: f.difficultyRating, enjoyment: f.enjoymentRating, text: f.feedbackText })) : []
  };

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this learning history and provide 3 patterns and 3 suggestions:\n\n${JSON.stringify(historyData, null, 2)}` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    // Calculate subject distribution if not provided or to ensure accuracy
    const distribution = concepts.reduce((acc: any, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});
    
    const total = concepts.length;
    result.subjectDistribution = Object.entries(distribution).map(([subject, count]: [string, any]) => ({
      subject,
      count,
      percent: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count);

    return result;
  } catch (error) {
    console.error("Dynamic insights generation failed:", error);
    return {
      patterns: [{ pattern: "Analysis Pending", insight: "We're still gathering enough data to form deep insights." }],
      suggestions: ["Continue exploring new concepts to unlock deeper analysis."],
      subjectDistribution: []
    };
  }
}

export async function generateLearnerProfile(concepts: any[]): Promise<string> {
  if (concepts.length === 0) return "A new journey is just beginning.";

  const systemPrompt = `You are an expert learning analyst. Create a concise, insightful profile of someone's learning journey based on their history.
The profile should sound like a natural observation from someone watching their progress from afar. 
Avoid terms like "the user" or "the learner". Instead, use "You" or speak directly to their patterns and growth.

The profile should help another AI understand:
1. What domains have been explored and mastered
2. Observable learning patterns and interests
3. Natural knowledge gaps and potential next steps
4. Real-world application focus areas

Be specific and actionable. Keep it to 300-400 words.`;

  const learningHistory = concepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} (${c.category})\n   Learned: ${c.what}\n   Applications: ${c.where.slice(0, 2).join(", ")}`,
    )
    .join("\n\n");

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate a learner profile based on this learning history:\n\n${learningHistory}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 800,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      "Learner profile generation failed"
    );
  } catch (error) {
    console.error("Learner profile generation failed:", error);
    return "Unable to generate learner profile";
  }
}

export async function generateResourceQueries(
  conceptTitle: string,
  category: string,
): Promise<string[]> {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Generate 5 concise, specific Google search queries to find educational resources for a concept. Return ONLY a JSON array of strings, one per line.",
        },
        {
          role: "user",
          content: `Generate search queries for: ${conceptTitle} (Category: ${category})`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content?.trim() || "[]";
    try {
      return JSON.parse(text);
    } catch {
      return text
        .split("\n")
        .filter((q) => q.trim())
        .slice(0, 5);
    }
  } catch (error) {
    console.error("Resource query generation failed:", error);
    return [];
  }
}

export interface ResourceResult {
  title: string;
  url: string;
  source: string;
  type: string;
  description: string;
}

export async function rankResourcesRelevance(
  conceptTitle: string,
  resources: ResourceResult[],
): Promise<ResourceResult[]> {
  if (resources.length === 0) return [];

  const resourceList = resources
    .map(
      (r, i) =>
        `${i + 1}. "${r.title}" (${r.source}) - ${r.description?.substring(0, 100) || ""}`,
    )
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rank these resources by relevance to teaching "${conceptTitle}". Return a JSON array with indices in order of relevance (most to least relevant).

Resources:
${resourceList}

Return ONLY: {"order": [indices in order]}`,
    });

    const text = response.text || "";
    try {
      const parsed = JSON.parse(text);
      const order = parsed.order || [];
      return order.map((idx: number) => resources[idx]).filter((r: any) => r);
    } catch {
      return resources;
    }
  } catch (error) {
    console.error("Resource ranking failed:", error);
    return resources;
  }
}

export interface FiveWHResult {
  title: string;
  category: string;
  problem: string;
  what: string;
  why: string;
  how: string;
  where: string[];
  who: string;
  when: string;
  pseudocode?: string;
}

export async function generate5WH(userInput: string): Promise<FiveWHResult> {
  const systemPrompt = `You are an educational AI that helps learners connect concepts to real-world problems.
Analyze the user's learning input and extract a comprehensive 5W+H breakdown.

Focus on:
- WHAT: Core concept explanation
- WHY: Real-world importance and relevance
- HOW: Mechanism, process, or implementation
- WHERE: Specific real-world applications (list 3-5 concrete examples)
- WHO: People or professions who use this
- WHEN: Historical context or timeline
- PSEUDOCODE: Only if it's a technical/programming concept

Also identify:
- TITLE: Short, clear title for the concept
- CATEGORY: Subject area (Physics, Biology, Math, CS, etc.)
- PROBLEM: What real-world problem does this solve?

Return valid JSON in this exact format:
{
  "title": "Concept Name",
  "category": "Subject",
  "problem": "What problem does this solve?",
  "what": "Core explanation",
  "why": "Why it matters",
  "how": "How it works",
  "where": ["Application 1", "Application 2", "Application 3"],
  "who": "Who uses this",
  "when": "Historical context",
  "pseudocode": "Optional pseudocode if technical"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            problem: { type: "string" },
            what: { type: "string" },
            why: { type: "string" },
            how: { type: "string" },
            where: {
              type: "array",
              items: { type: "string" },
            },
            who: { type: "string" },
            when: { type: "string" },
            pseudocode: { type: "string" },
          },
          required: [
            "title",
            "category",
            "problem",
            "what",
            "why",
            "how",
            "where",
            "who",
            "when",
          ],
        },
      },
      contents: userInput,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const result = JSON.parse(rawJson);
    return result;
  } catch (error: any) {
    if (error?.status === 429 || error?.code === 429 || error?.message?.includes("quota") || error?.message?.includes("429")) {
      console.warn("Gemini quota exceeded (429), immediately falling back to Groq");
    } else {
      console.error("Gemini 5WH generation failed, falling back to Groq:", error);
    }

    // Fallback to Groq
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nReturn ONLY valid JSON, nothing else.",
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText =
      groqResponse.choices[0]?.message?.content?.trim() || "";

    // Extract JSON from response using safer method
    const result = extractValidJSON(responseText);
    return result;
  }
}

/**
 * Suggest 3 dynamic tool alternatives for a project based on its context
 */
export async function suggestToolAlternatives(
  projectName: string,
  problemAddressed: string,
  industry: string,
  currentLanguage: string,
  excludedLanguages: string[] = []
): Promise<string[]> {
  const systemPrompt = `You are a technical architect. Based on the project details, suggest the 3 most professional and valid alternative programming languages or tools that could be used to build this exact same project.
Consider the industry, problem space, and modern best practices.
CRITICAL: Do NOT suggest any of these languages: ${excludedLanguages.join(", ")}.
Return ONLY a JSON array of 3 strings. Example: ["Rust", "Go", "TypeScript"]`;

  const userContext = `Project: ${projectName}
Problem: ${problemAddressed}
Industry: ${industry}
Current Tool: ${currentLanguage}

Suggest 3 alternatives:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3
        },
      },
      contents: userContext,
    });

    const rawJson = response.text;
    const result = JSON.parse(rawJson || "[]");
    return Array.isArray(result) ? result.slice(0, 3) : ["Python", "JavaScript", "C++"];
  } catch (error) {
    console.error("Tool suggestion failed, falling back to Groq:", error);
    
    try {
      const groqResponse = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContext,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 300,
      });

      const responseText = groqResponse.choices[0]?.message?.content?.trim() || "[]";
      const result = extractValidJSON(responseText);
      return Array.isArray(result) ? result.slice(0, 3) : ["Python", "JavaScript", "C++"];
    } catch (groqError) {
      console.error("Groq fallback for tool suggestion failed:", groqError);
      return ["Python", "JavaScript", "C++"].filter(l => l.toLowerCase() !== currentLanguage.toLowerCase()).slice(0, 3);
    }
  }
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
}

/**
 * Convert an existing project implementation to a new target language/tool
 * Preserves the "What" and "Why" while rewriting the "How"
 */
export async function convertImplementation(
  implementation: any,
  targetLanguage: string
): Promise<Partial<ImplementationPreview> & { instructions: string, code: string, pseudocode: string, flowDiagram: string }> {
    const systemPrompt = `You are an expert polyglot developer. Your task is to convert an existing project implementation to a new target language/tool.
CRITICAL:
1. Keep the project name, problem, real-world context, and industry IDENTICAL.
2. Rewrite the "How to Build" instructions specifically for ${targetLanguage} best practices.
3. Translate the code, pseudocode, and flow diagram to ${targetLanguage}.
4. Ensure the instructions are educational and explain "why" for each step.
5. Provide a simplified flowchart in the "flowDiagram" field using valid Mermaid.js syntax. 
   - Start with 'graph TD'.
   - Use standard node shapes: [Square] for processes, {Diamond} for decisions, ([Stadium]) for start/end.
   - Use clear node IDs (A, B, C) and descriptive labels.
   - Example: graph TD\n  A([Start]) --> B{Is valid?}\n  B -- Yes --> C[Process]\n  B -- No --> D[End]
   - Ensure the diagram is logically complete and follows Mermaid syntax rules.

Return valid JSON in this exact format:
{
  "code": "The full source code",
  "pseudocode": "Step-by-step algorithm",
  "flowDiagram": "graph TD\n  A([Start]) --> B[Process]\n  B --> C([End])",
  "instructions": "Detailed numbered build steps",
  "language": "${targetLanguage}",
  "tool": "${targetLanguage}"
}`;

  const currentContext = `Current Project: ${implementation.projectName}
Problem: ${implementation.problemAddressed}
Context: ${implementation.realWorldContext}
Industry: ${implementation.industry}
Target Language: ${targetLanguage}

Original Instructions to convert:
${implementation.instructions}

Original Code to translate:
${implementation.code}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: currentContext,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    // Clean up response string in case of Markdown wrapping or trailing content
    let cleaned = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson);
    cleaned = cleaned.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Attempt to find the first '{' and last '}' to handle potential preamble/postscript
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      const result = JSON.parse(cleaned);
      return {
        ...result,
        instructions: result.instructions
      };
    } catch (e) {
      console.error("Failed to parse AI JSON response:", cleaned);
      throw e;
    }
  } catch (error) {
    console.error("Implementation conversion failed, falling back to Groq:", error);

    // Fallback to Groq
    try {
      const groqResponse = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt + "\n\nReturn ONLY valid JSON, nothing else.",
          },
          {
            role: "user",
            content: currentContext,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 4000,
      });

      const responseText = groqResponse.choices[0]?.message?.content?.trim() || "";
      const result = extractValidJSON(responseText);
      return {
        ...result,
        instructions: result.instructions
      };
    } catch (groqError) {
      console.error("Groq fallback conversion failed:", groqError);
      throw groqError;
    }
  }
}

/**
 * Validate if a user-provided tool is appropriate for the project
 */
export async function validateCustomTool(
  projectName: string,
  problemAddressed: string,
  tool: string
): Promise<{ valid: boolean; reason?: string }> {
  const systemPrompt = `You are a technical architect. Validate if the provided tool is a valid and professional choice for building the described project.
If it is valid, return {"valid": true}.
If it is NOT valid (e.g., totally unrelated, impossible to implement this project with, or just a random word), return {"valid": false, "reason": "A short explanation of why this tool isn't suitable for this specific project"}.
Return ONLY JSON.`;

  const context = `Project: ${projectName}
Problem: ${problemAddressed}
Proposed Tool: ${tool}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: context,
    });
    const rawText = response.text || "{\"valid\": true}";
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      return { valid: true };
    }
  } catch (error) {
    return { valid: true };
  }
}

export async function generateInlinePrompt(
  userInput: string,
  previousPrompts: string[],
  recentTyping: string,
): Promise<string> {
  const maxRetries = 3;
  const bannedPhrases = [
    "what do you mean",
    "define",
    "what is",
    "explain what",
    "meaning of",
    "what does",
    "definition",
  ];

  try {
    // Try up to maxRetries times to generate a valid prompt
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Step 1: Generate prompt based on what user just typed with improved system prompt
      const initialPromptSystem = `You are an AI learning companion that is Like a "listening parent wantig to hear so much from his child what the cild learnt that day without making the child feel like they are in an examination". Your goal is to encourage the user to share more about what they are learning.
Instead of acting like an examiner or asking testing questions, reply with warm, supportive prompts that make the user feel heard and motivated to elaborate.

Rules:
- Use short phrases like: "I'm all ears!", "Tell me more about that.", "That sounds fascinating—keep going!", "I'd love to hear your take on this.", or "Wow, share more!".
- Stay a supportive listener—never teach, correct, or explain.
- Never ask clarifying questions like "What do you mean by X?" or "Can you define X?".
- Never ask testing questions like "What are the three types of X?" or "Give an example of Y.".
- Keep every response very concise (under 15 words total).
- Avoid repeating or echoing previous prompts—always build fresh enthusiasm.
- End every response with an inviting hook to share more.
- Avoid redundancy with previous questions: ${previousPrompts.join(", ")}

Generate a NEW warm, encouraging prompt that invites the user to continue their explanation based on what they just typed.`;

      const initialCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: initialPromptSystem,
          },
          {
            role: "user",
            content: `What they just typed: "${recentTyping}"\n\nGenerate a brief clarifying question that encourages them to think deeper about the concept.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6 + attempt * 0.05, // Moderate temperature for consistency
        max_tokens: 100,
      });

      const candidatePrompt =
        initialCompletion.choices[0]?.message?.content?.trim() || "";

      if (!candidatePrompt) {
        continue; // Try again if no prompt generated
      }

      // Step 2: Secondary filter - check for banned phrases
      const lowerCasePrompt = candidatePrompt.toLowerCase();
      const hasBannedPhrase = bannedPhrases.some((phrase) =>
        lowerCasePrompt.includes(phrase),
      );

      if (hasBannedPhrase) {
        console.log(
          `Filtered out prompt with banned phrase: ${candidatePrompt}`,
        );
        continue; // Skip this prompt and retry
      }

      // Step 3: Validate the prompt against the full context
      const validationSystem = `You are a strict validation AI checking if a follow-up prompt is encouraging and "all ears."

Your job:
1. Ensure the prompt is warm, supportive, and invites more sharing (e.g., "Tell me more," "I'm listening").
2. Reject prompts that:
   - Sound like an examiner or teacher
   - Ask for definitions or literal meanings
   - Ask "What do you mean?"
   - Are redundant with previous prompts
3. Respond with ONLY:
   - "YES" if the prompt is encouraging and non-examiner-like
   - "NO" if it sounds like a test or is cold`;

      const validationCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: validationSystem,
          },
          {
            role: "user",
            content: `Complete entry: "${userInput}"
Recent typing: "${recentTyping}"
Proposed question: "${candidatePrompt}"
Previous questions asked: ${previousPrompts.length > 0 ? previousPrompts.join("; ") : "None"}

Is this a good question that encourages deeper understanding? Answer with ONLY YES or NO.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2, // Low temperature for strict validation
        max_tokens: 5,
      });

      const validation =
        validationCompletion.choices[0]?.message?.content
          ?.trim()
          .toUpperCase() || "NO";

      // If validated, return the prompt
      if (validation === "YES") {
        console.log(`Valid prompt generated: ${candidatePrompt}`);
        return candidatePrompt;
      }

      // If not validated and we have more attempts, continue loop
      console.log(`Attempt ${attempt + 1} failed validation, retrying...`);
    }

    // If all retries failed, return empty string (no prompt shown)
    console.log("All validation attempts failed, no prompt shown");
    return "";
  } catch (error) {
    console.error("Groq API error:", error);
    return "";
  }
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  conceptContext?: string,
): Promise<string> {
  const systemPrompt = `You are an educational AI companion.
Your goal is to be helpful and direct. Focus on answering follow-up questions specifically.

${conceptContext ? `Context about the concept being discussed: ${conceptContext}` : ""}

Guidelines:
- Answer the user's question directly and immediately.
- Be concise. Avoid lengthy preambles or repetitive enthusiastic filler.
- Do not be overly verbal. Provide high-value information without padding.
- Use natural paragraphs; only use formatting (bullets) if strictly necessary for a list.
- Maintain a friendly but professional and focused tone.
- If the user asks a follow-up, prioritize that specific answer over general concept review.`;

  const messages = conversationHistory
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
    )
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
      contents: `${messages}\n\nUser: ${userMessage}\n\nProvide a helpful response:`,
    });

    return (
      response.text ||
      "I apologize, but I'm having trouble responding right now."
    );
  } catch (error) {
    console.error("Gemini chat response failed, falling back to Groq:", error);

    // Fallback to Groq
    const groqMessages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: userMessage,
      },
    ];

    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...groqMessages,
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
    });

    return (
      groqResponse.choices[0]?.message?.content ||
      "I apologize, but I'm having trouble responding right now."
    );
  }
}

export async function generateTags(
  conversationContent: string,
): Promise<string[]> {
  const systemPrompt = `You are an AI that generates relevant tags for educational conversations.
Generate 3-5 concise, relevant tags that categorize this conversation.

Tags should be:
- Single words or short phrases
- Lowercase
- Related to topics, concepts, or themes discussed
- Useful for searching and organizing

Return valid JSON array of strings. Example: ["tag1", "tag2", "tag3"]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: { type: "string" },
        },
      },
      contents: conversationContent,
    });

    const rawJson = response.text;
    if (!rawJson) {
      return ["general"];
    }

    const tags = JSON.parse(rawJson);
    return Array.isArray(tags) ? tags : ["general"];
  } catch (error) {
    console.error("Gemini tag generation failed, falling back to Groq:", error);

    // Fallback to Groq
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nReturn ONLY a JSON array, nothing else.",
        },
        {
          role: "user",
          content: conversationContent,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 200,
    });

    const responseText =
      groqResponse.choices[0]?.message?.content?.trim() || "";

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return ["general"];
      }
      const tags = JSON.parse(jsonMatch[0]);
      return Array.isArray(tags) ? tags : ["general"];
    } catch {
      return ["general"];
    }
  }
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
}

export async function generateImplementationPreview(
  concept: any,
  conversationHistory: { role: string; content: string }[],
  userConcepts: any[] = [],
  learnerProfile: string = "",
): Promise<ImplementationPreview> {
  const systemPrompt = `You are an educational AI that generates REAL-WORLD project implementation previews personalized to each learner.
Your mission is to create projects that solve actual problems people face or contribute to solving bigger challenges - NOT textbook exercises.

The preview must include:
- Project name (descriptive, sounds like a real project)
- Type (Simulation, Script, Application, Lab, Tool, etc.)
- Tool/Platform (appropriate for the problem)
- Programming language
- Components (3-5 key parts needed to solve this problem)
- Learning goals (2-3 real outcomes users will achieve)
- Problem addressed: The specific, concrete problem this solves or contributes to
- Why suggested: Why this problem matters and connects to what they learned (HIGHLY PERSONALIZED to their specific journey)
- Real world context: Where/how this problem exists in the real world
- Industry: Which industry or field uses this
- Flow Diagram: A valid and complete Mermaid.js flowchart definition starting with 'graph TD'. Use node IDs like A, B, C and labels like A[Label]. Ensure it is syntactically correct and represents the logic flow. CRITICAL: Do NOT use semicolons (;) or braces ({}) at the end of lines. Avoid special characters inside labels.

CRITICAL PERSONALIZATION:
You have access to the learner's profile. Use it to:
1. Build on concepts they already mastered (reference their profile strengths)
2. Fill specific gaps mentioned in their profile
3. Suggest projects that match their demonstrated learning patterns
4. Progress them toward their apparent interests based on what they've learned

CRITICAL: Focus on real-world impact:
- Instead of "Simulate a circuit" → "Design a circuit for an IoT temperature sensor used in smart homes"
- Instead of "Sort algorithm exercise" → "Build an optimization system to sort delivery routes (reduces fuel costs)"
- Instead of "Basic data analysis" → "Analyze patient health data to identify early disease patterns (healthcare impact)"

Choose tools based on practical use:
- Physics/Engineering: MATLAB, Python with NumPy/SciPy
- Data Science: Python with Pandas/Matplotlib
- Web: JavaScript/TypeScript
- General Programming: Python, Java, C++

Return valid JSON.`;

  const learnerProfileContext = learnerProfile
    ? `\n\nLEARNER PROFILE:\n${learnerProfile}`
    : "";

  const contextMessage = `Concept: ${concept.title}
Category: ${concept.category}
What: ${concept.what}
Why matters: ${concept.why}
How: ${concept.how}
Real-world applications: ${concept.where.join(", ")}

Recent conversation: ${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}${learnerProfileContext}

Generate an implementation preview that:
1. Solves a REAL-WORLD problem (not a classroom exercise)
2. Connects specifically to this learner's profile and demonstrated capabilities
3. Shows progression in their learning journey
4. Helps them apply their knowledge to actual problems that matter`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            type: { type: "string" },
            tool: { type: "string" },
            language: { type: "string" },
            components: {
              type: "array",
              items: { type: "string" },
            },
            learningGoals: {
              type: "array",
              items: { type: "string" },
            },
            problemAddressed: { type: "string" },
            whySuggested: { type: "string" },
            realWorldContext: { type: "string" },
            industry: { type: "string" },
            flowDiagram: { type: "string" },
          },
          required: [
            "projectName",
            "type",
            "tool",
            "language",
            "components",
            "learningGoals",
            "problemAddressed",
            "whySuggested",
            "realWorldContext",
            "industry",
            "flowDiagram",
          ],
        },
      },
      contents: contextMessage,
    });

    const rawJson = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    return extractValidJSON(rawJson);
  } catch (error: any) {
    if (error?.status === 429 || error?.code === 429 || error?.message?.includes("quota") || error?.message?.includes("429")) {
      console.warn("Gemini quota exceeded (429), immediately falling back to Groq for implementation preview");
    } else {
      console.error("Gemini implementation preview failed, falling back to Groq:", error);
    }

    // Fallback to Groq with personalization
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            systemPrompt +
            "\n\nReturn ONLY valid JSON, nothing else. Make 'whySuggested' personalized to their specific learning history.",
        },
        {
          role: "user",
          content: contextMessage,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseText =
      groqResponse.choices[0]?.message?.content?.trim() || "";

    const result = extractValidJSON(responseText);
    
    // Ensure all required fields have at least default values to prevent database constraint errors
    const preview = {
      projectName: result.projectName || concept.title || "Project Implementation",
      type: result.type || "Application",
      tool: result.tool || "Web Technologies",
      language: result.language || "JavaScript",
      components: Array.isArray(result.components) ? result.components : ["Core Logic"],
      learningGoals: Array.isArray(result.learningGoals) ? result.learningGoals : ["Apply concept to real-world scenario"],
      problemAddressed: result.problemAddressed || concept.problem || "Practical application of knowledge",
      whySuggested: result.whySuggested || "This project builds on your existing knowledge.",
      realWorldContext: result.realWorldContext || "Professional environment",
      industry: result.industry || concept.category || "Technology",
      flowDiagram: result.flowDiagram || "A[Start] --> B[Process] --> C[End]"
    };

    return preview;
  }
}

export interface FullImplementation {
  code: string;
  pseudocode: string;
  flowDiagram: string;
  instructions: string;
}

/**
 * Use Groq to filter out prerequisites the user already knows from completed projects
 * Returns only NEW prerequisites the user needs to learn
 */
export async function filterOutMasteredPrerequisites(
  allPrerequisites: string[],
  masteredPrerequisites: string[],
): Promise<string[]> {
  if (masteredPrerequisites.length === 0 || allPrerequisites.length === 0) {
    return allPrerequisites;
  }

  try {
    const filterPrompt = `You are an expert in identifying which prerequisites a student needs to learn.

NEW PREREQUISITES (to potentially suggest):
${allPrerequisites.map((p, i) => `${i + 1}. ${p}`).join("\n")}

PREREQUISITES USER ALREADY KNOWS (from past completed projects):
${masteredPrerequisites.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Your task:
1. Identify which NEW prerequisites are semantically DIFFERENT from the mastered ones
2. Remove or consolidate duplicates (e.g., "basic Python" is covered if they know "Python fundamentals")
3. Return ONLY the prerequisites the student still needs to learn

Return ONLY a JSON array of strings with the prerequisite names to suggest. Example: ["React Hooks", "WebSockets"]
If all new prerequisites are already known, return an empty array: []`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an educational prerequisite analyzer. Return ONLY valid JSON arrays.",
        },
        {
          role: "user",
          content: filterPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = response.choices[0]?.message?.content?.trim() || "[]";
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.warn("Failed to parse Groq response for prerequisite filtering");
      return allPrerequisites;
    }

    const filtered = JSON.parse(jsonMatch[0]);
    return Array.isArray(filtered) ? filtered : allPrerequisites;
  } catch (error) {
    console.error(
      "Prerequisite filtering failed, returning all prerequisites:",
      error,
    );
    return allPrerequisites;
  }
}

/**
 * Use Groq to intelligently find the best template project for the current context
 * Analyzes semantic similarity rather than just type/tool/language matching
 */
export async function selectBestProjectTemplate(
  concept: any,
  preview: any,
  candidateProjects: any[],
): Promise<any | null> {
  console.log("🤖 [GROQ-SELECT] selectBestProjectTemplate() called");

  if (!candidateProjects || candidateProjects.length === 0) {
    console.log(
      "🤖 [GROQ-SELECT] No candidate projects available for template selection",
    );
    return null;
  }

  // If only one candidate, use it directly
  if (candidateProjects.length === 1) {
    console.log(
      `🤖 [GROQ-SELECT] ✅ Only one candidate found, using as template: ${candidateProjects[0].projectName}`,
    );
    return candidateProjects[0];
  }

  try {
    console.log(
      `🤖 [GROQ-SELECT] Using Groq to select best template from ${candidateProjects.length} candidates...`,
    );
    // Build context about the new project
    const newProjectContext = `
New Project to Generate:
- Concept: ${concept.title}
- Category: ${concept.category}
- Problem: ${preview.problemAddressed}
- Why: ${preview.whySuggested}
- Real-World Context: ${preview.realWorldContext}
- Type: ${preview.type}
- Tool: ${preview.tool}
- Language: ${preview.language}
- Components: ${preview.components.join(", ")}`;

    // Build context about available templates
    const candidatesContext = candidateProjects
      .map(
        (proj, idx) => `
Template ${idx + 1}:
- Name: ${proj.projectName}
- Type: ${proj.type}
- Tool: ${proj.tool}
- Language: ${proj.language}
- Problem: ${proj.problemAddressed || "N/A"}
- Context: ${proj.realWorldContext || "N/A"}`,
      )
      .join("\n");

    const selectionPrompt = `You are an AI assistant helping select the best template project for code generation.

${newProjectContext}

Available templates to choose from:
${candidatesContext}

Analyze which template project is MOST semantically similar to the new project in terms of:
1. Problem-solving approach and context
2. Tool and language usage
3. Instructional structure and complexity
4. Real-world application domain

Return ONLY a JSON response with this exact format:
{
  "selectedIndex": <number from 0 to ${candidateProjects.length - 1}>,
  "reasoning": "<brief explanation of why this template matches best>",
  "confidence": <number from 0 to 1>
}`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at finding semantic similarity. Return ONLY valid JSON with no additional text.",
        },
        {
          role: "user",
          content: selectionPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = response.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.warn(
        "Template selection failed to parse JSON, using first candidate",
      );
      return candidateProjects[0];
    }

    const selection = JSON.parse(jsonMatch[0]);
    const selectedIdx = Math.max(
      0,
      Math.min(selection.selectedIndex, candidateProjects.length - 1),
    );
    const selectedProject = candidateProjects[selectedIdx];

    console.log(
      `🤖 [GROQ-SELECT] ✅ Groq selected template: ${selectedProject.projectName}`,
    );
    console.log(`🤖 [GROQ-SELECT]    Confidence: ${selection.confidence}`);
    console.log(`🤖 [GROQ-SELECT]    Reasoning: ${selection.reasoning}`);

    return selectedProject;
  } catch (error) {
    console.error(
      "🤖 [GROQ-SELECT] ❌ Template selection failed, using first candidate:",
      error,
    );
    return candidateProjects[0];
  }
}

/**
 * Format instructions by removing Markdown syntax and cleaning visual presentation
 * Uses Groq as the final "editor" to ensure clean, consistent visual output
 */
async function formatInstructionsForDisplay(
  instructions: string,
): Promise<string> {
  if (!instructions) return "";

  try {
    const cleanupPrompt = `You are a final visual editor for educational instructions. Your ONLY job is to:
1. Preserve Markdown **bold** syntax for key terms, actions, or important emphasizes.
2. Remove other Markdown syntax (__, *, -, etc. unless they are bullets)
3. Keep the text clean and natural
4. Preserve structure using line breaks and indentation
5. Remove any trailing asterisks or formatting symbols
6. Ensure numbered lists are clean
7. Return ONLY the cleaned text with bolding preserved, nothing else

Instructions to clean:
${instructions}`;

    const response = await withRateLimitRetry(
      () => groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a text formatter. Remove all Markdown syntax and return clean, readable text. Return ONLY the formatted text.",
          },
          {
            role: "user",
            content: cleanupPrompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 16000,
      }),
      "Stage 4.5 Format",
    );

    const cleanedText =
      response.choices[0]?.message?.content?.trim() || instructions;
    return cleanedText;
  } catch (error) {
    console.error("Instruction formatting failed, using original:", error);
    // Fallback: simple client-side cleanup
    return instructions
      .replace(/\*\*/g, "")
      .replace(/__(.*?)__/g, "$1")
      .replace(/^\*\s+/gm, "")
      .trim();
  }
}

export async function generateImplementationCode(
  concept: any,
  preview: any,
  chatHistory: any[] = [],
  generationId?: string,
  previousProjectContext?: any,
): Promise<FullImplementation> {
  const systemPrompt = `You are an educational AI that generates complete, working code implementations with thorough instructions.

INSTRUCTION QUALITY RULES:
- Every step that is genuinely needed must be fully written out — no skipping, no "and so on", no "as usual".
- Explain WHY each step is needed, not just what to do. Only include explanations that are actually useful.
- Cover every real decision point, configuration option, and command the user will encounter.
- Include what the user should see/expect after each step so they can verify they're on track.
- Include troubleshooting for issues that genuinely and commonly occur — skip trivial ones.
- Do NOT pad with filler content. Every sentence must be necessary and useful.
- Do NOT summarize or condense steps that require full explanation.

Include:
- Complete working code (fully formatted, with comments explaining non-obvious parts)
- Detailed pseudocode with explanations for each logical block
- Comprehensive flow diagram (text representation covering all real decision branches)
- Full step-by-step instructions: setup, configuration, running, verifying, and troubleshooting

Explain WHY things work, not just HOW. Cover everything necessary — nothing more, nothing less.`;

  // Build hybrid template context from similar project if available
  let hybridTemplateContext = "";
  if (previousProjectContext) {
    hybridTemplateContext = `\n\nHYBRID APPROACH - Use similar project as structure template:
Previous similar project: ${previousProjectContext.projectName}
- Type: ${previousProjectContext.type}
- Tool: ${previousProjectContext.tool}
- Language: ${previousProjectContext.language}
- Structure pattern: Adapt the instruction structure/format from this previous project for consistency
- Reuse sections: Keep the "BEFORE YOU BEGIN", "QUICK START", dividers (--- Section ---) pattern
- Adapt content: Remix the instruction approach for THIS project's specific context, don't copy verbatim`;
  }

  // Build the 5W+H context
  const fiveWHContext = `
5W+H Analysis:
- WHAT: ${concept.what || concept.description || "N/A"}
- WHERE: ${Array.isArray(concept.where) ? concept.where.join(", ") : (concept.where || "N/A")}
- WHY: ${concept.why || "N/A"}
- WHO: ${concept.who || "N/A"}
- WHEN: ${concept.when || "N/A"}
- HOW: ${concept.how || "N/A"}`;

  // Build chat history context if available
  let chatContext = "";
  if (chatHistory && chatHistory.length > 0) {
    const userQuestions = chatHistory
      .filter((msg: any) => msg.role === "user")
      .map((msg: any) => `- ${msg.content}`)
      .join("\n");
    chatContext = `\n\nUser's Questions and Requirements:\n${userQuestions}`;
  }

  // Build project overview context
  const projectContext = `\nProject Overview:
- Problem Addressed: ${preview.problemAddressed || "N/A"}
- Why Suggested: ${preview.whySuggested || "N/A"}
- Real-World Context: ${preview.realWorldContext || "N/A"}
- Industry: ${preview.industry || "General"}`;

  const contextMessage = `Concept: ${concept.title || concept.name || "N/A"}
Category: ${concept.category || "General"}
${fiveWHContext}

Project: ${preview.projectName}
Language: ${preview.language}
Tool: ${preview.tool}
Components: ${Array.isArray(preview.components) ? preview.components.join(", ") : "N/A"}
${projectContext}
${chatContext}
${hybridTemplateContext}

Generate complete implementation code, pseudocode, flow diagram, and instructions that address the user's specific context and questions.`;

  try {
    // Import SSE helpers
    const { sendStageStart, sendStageComplete, sendProgressDetail, sendError, isGenerationCanceled } =
      generationId
        ? await import("./sse-generator")
        : {
            sendStageStart: () => {},
            sendStageComplete: () => {},
            sendProgressDetail: () => {},
            sendError: () => {},
            isGenerationCanceled: () => false,
          };

    // Helper to check for cancellation
    const checkCanceled = () => {
      if (generationId && isGenerationCanceled(generationId)) {
        console.log(`[AI] Generation ${generationId} was canceled, aborting...`);
        throw new Error("CANCELED");
      }
    };

    // Stage 1: Gemini analyzes and generates initial structure (with Groq fallback)
    console.log("Stage 1: Analyzing project structure...");
    checkCanceled();
    if (generationId)
      sendStageStart(generationId, 1, "Analyzing project structure");
    if (generationId)
      sendProgressDetail(generationId, `Analyzing concept: ${concept.title}`);

    let geminiResult;

    try {
      console.log("Stage 1: Attempting Gemini API...");
      const geminiResponse = await withRateLimitRetry(
        () => ai.models.generateContent({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                code: { type: "string" },
                pseudocode: { type: "string" },
                flowDiagram: { type: "string" },
                instructions: { type: "string" },
              },
              required: ["code", "pseudocode", "flowDiagram", "instructions"],
            },
          },
          contents: contextMessage,
        }),
        "Stage 1 Gemini",
        4,
        generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
      );

      checkCanceled(); // Check after potential long-running AI call

      const geminiJson = geminiResponse.text;
      if (!geminiJson) {
        throw new Error("Empty response from Gemini");
      }

      geminiResult = JSON.parse(geminiJson);
      console.log("✅ Stage 1: Gemini analysis successful");
      if (generationId)
        sendProgressDetail(
          generationId,
          "Gemini analysis complete - using Gemini results",
        );
    } catch (geminiError) {
      if (geminiError instanceof Error && geminiError.message === "Generation canceled by user") throw geminiError;
      console.error(
        "❌ Stage 1: Gemini failed, falling back to Groq:",
        geminiError,
      );
      if (generationId)
        sendProgressDetail(
          generationId,
          "Gemini unavailable, using Groq for analysis",
        );

      // Fallback to Groq for Stage 1
      const groqStage1Response = await withRateLimitRetry(
        () => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                systemPrompt +
                `\n\nYou are generating an implementation SPECIFICALLY for: "${preview.projectName}" using ${preview.language} / ${preview.tool}.` +
                `\nDo NOT generate content for any other project or technology.` +
                `\nReturn ONLY valid JSON with keys: code, pseudocode, flowDiagram, instructions. Each field must be non-empty and directly relevant to the project above.`,
            },
            {
              role: "user",
              content: contextMessage,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          max_tokens: 16000,
        }),
        "Stage 1 Groq",
        4,
        generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
      );

      checkCanceled(); // Check after fallback call

      const groqText =
        groqStage1Response.choices[0]?.message?.content?.trim() || "";
      geminiResult = extractValidJSON(groqText);
      console.log("✅ Stage 1: Groq fallback successful");
    }

    if (generationId) sendStageComplete(generationId, 1, "Analysis complete");

    // Stage 2: Gemini enhances each segment for better reliability
    console.log("Stage 2: Gemini refining and enhancing instructions...");
    // Pace requests to stay within Gemini free-tier rate limits (15 RPM)
    console.log(`[Rate Limit] Waiting ${GEMINI_INTER_CALL_DELAY_MS / 1000}s before Stage 2 Gemini call...`);
    await sleep(GEMINI_INTER_CALL_DELAY_MS);
    checkCanceled();
    if (generationId)
      sendStageStart(generationId, 2, "Gemini refining instructions");
    if (generationId)
      sendProgressDetail(
        generationId,
        "Segmenting and enhancing implementation...",
      );

    let geminiEnhancedResult = { ...geminiResult }; // Default fallback

    try {
      // Enhance instructions with Gemini
      if (geminiResult.instructions) {
        if (generationId)
          sendProgressDetail(generationId, "Enhancing instructions segment...");
        try {
          const similarProjectContext = previousProjectContext
            ? `\n\nReference similar project structure (adapt, don't copy):\n${previousProjectContext.instructions ? previousProjectContext.instructions.substring(0, 500) + "..." : "N/A"}`
            : "";

          const enhancedInstructionsResponse = await withRateLimitRetry(
            () => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            config: {
              systemInstruction: `You are an expert at creating thorough, practical step-by-step implementation guides. Your job is to EXPAND the provided instructions to cover every genuinely necessary detail — without adding filler or padding.

QUALITY RULES:
- Do NOT summarize, condense, or skip any step that the user actually needs to perform.
- Explain WHY each step matters, but only when that explanation is genuinely useful.
- Every command, file path, and configuration value must be written out explicitly.
- Cover what the user will see/expect at each step so they can self-verify.
- Include troubleshooting only for issues that commonly and realistically occur.
- Do NOT pad with obvious statements or restated information.
- Every sentence must earn its place — necessary and useful, nothing more.

REQUIRED STRUCTURE — add these sections while KEEPING all existing content:

1. "BEFORE YOU BEGIN:" — cover real prerequisites: what must be installed, what accounts are needed, and what the user will end up building.

2. "QUICK START (Advanced Users):" — condensed commands for experienced users, ending with "Full guide continues below..."

3. Each step broken into "--- Section Name ---" sub-sections where the step genuinely has distinct phases.

4. Code snippets with explanations for any non-obvious line or configuration value.

5. After each major action: what the user should see or verify to know it worked.

6. "TROUBLESHOOTING:" — only real, common errors with actionable fixes.

7. "VERIFY IT'S WORKING:" — concrete checks to confirm the implementation is correct.

8. "NEXT STEPS:" — brief, relevant suggestions for what to explore next.

9. Preserve ALL existing technical accuracy — only expand where genuinely needed, never remove content.

${previousProjectContext ? "10. HYBRID APPROACH: Follow the structural pattern from similar projects but adapt content for this project context." : ""}

Return ONLY valid JSON with key: instructions.`,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  instructions: { type: "string" },
                },
                required: ["instructions"],
              },
            },
            contents: `Expand these instructions to cover every genuinely necessary detail. Do NOT shorten, summarize, or skip any real step. Every addition must be useful:${similarProjectContext}\n\nInstructions to expand:\n\n${geminiResult.instructions}`,
          }),
            "Stage 2 Instructions",
            4,
            generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
          );
          checkCanceled();
          const enhancedInstructionsText =
            enhancedInstructionsResponse.text || "";
          if (!enhancedInstructionsText)
            throw new Error("Empty instructions response");
          const enhancedInstructions = JSON.parse(enhancedInstructionsText);
          geminiEnhancedResult.instructions =
            enhancedInstructions.instructions || geminiResult.instructions;
          console.log(
            "✅ Stage 2: Instructions enhanced by Gemini with functional structure",
          );
        } catch (err) {
          if (err instanceof Error && err.message === "Generation canceled by user") throw err;
          console.error(
            "Stage 2: Gemini instructions enhancement failed, keeping original",
          );
          geminiEnhancedResult.instructions = geminiResult.instructions;
        }
      }

      // Skip pseudocode enhancement - let Stage 4 finalization handle it
      if (generationId)
        sendProgressDetail(
          generationId,
          "Pseudocode will be optimized in Stage 4...",
        );
      console.log(
        "⊘ Stage 2: Pseudocode enhancement skipped (will be optimized in Stage 4)",
      );
      geminiEnhancedResult.pseudocode = geminiResult.pseudocode;

      // Pace before the second Gemini call in Stage 2
      console.log(`[Rate Limit] Waiting ${GEMINI_INTER_CALL_DELAY_MS / 1000}s before flow-diagram enhancement call...`);
      await sleep(GEMINI_INTER_CALL_DELAY_MS);
      checkCanceled();

      // Enhance flow diagram with Gemini
      if (geminiResult.flowDiagram) {
        if (generationId)
          sendProgressDetail(generationId, "Enhancing flow diagram segment...");
        try {
          const enhancedDiagramResponse = await withRateLimitRetry(
            () => ai.models.generateContent({
              model: "gemini-3-flash-preview",
              config: {
                systemInstruction: `You are an expert at creating detailed flow diagrams. Enhance the provided flow diagram with more details, decision points, and loops. Return ONLY valid JSON with key: flowDiagram.`,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    flowDiagram: { type: "string" },
                  },
                  required: ["flowDiagram"],
                },
              },
              contents: `Enhance this flow diagram:\n\n${geminiResult.flowDiagram}`,
            }),
            "Stage 2 FlowDiagram",
            4,
            generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
          );
          checkCanceled();
          const enhancedDiagramText = enhancedDiagramResponse.text || "";
          if (!enhancedDiagramText) throw new Error("Empty diagram response");
          const enhancedDiagram = JSON.parse(enhancedDiagramText);
          geminiEnhancedResult.flowDiagram =
            enhancedDiagram.flowDiagram || geminiResult.flowDiagram;
          console.log("✅ Stage 2: Flow diagram enhanced by Gemini");
        } catch (err) {
          if (err instanceof Error && err.message === "Generation canceled by user") throw err;
          console.error(
            "Stage 2: Gemini diagram enhancement failed, keeping original",
          );
          geminiEnhancedResult.flowDiagram = geminiResult.flowDiagram;
        }
      }

      console.log("✅ Stage 2: Gemini enhancement successful");
      if (generationId)
        sendProgressDetail(generationId, "All segments enhanced");
    } catch (error) {
      console.error(
        "❌ Stage 2: Overall enhancement failed, falling back to Gemini result:",
        error,
      );
      if (generationId)
        sendProgressDetail(
          generationId,
          "Using Gemini analysis (enhancement unavailable)",
        );
      geminiEnhancedResult = geminiResult;
    }

    if (generationId)
      sendStageComplete(generationId, 2, "Enhancement complete");

    // Stage 3: Search for learning resources and add them to instructions
    console.log("Stage 3: Searching for learning resources...");
    checkCanceled();
    if (generationId)
      sendStageStart(generationId, 3, "Searching for learning resources");
    if (generationId)
      sendProgressDetail(
        generationId,
        "Fetching YouTube, Wikipedia, and book resources...",
      );
    const resourceQueries = [
      `${concept.title} tutorial`,
      `${preview.tool} ${preview.language} guide`,
      `${concept.category} best practices`,
    ];

    let resourcesContext = "";
    try {
      const { fetchResourcesForPrerequisites } = await import(
        "./resource-fetcher"
      );
      const resourcesMap =
        await fetchResourcesForPrerequisites(resourceQueries);
      checkCanceled();

      // Flatten the resources object into a single array
      const allResources: any[] = [];
      for (const resources of Object.values(resourcesMap)) {
        allResources.push(...resources);
      }

      if (allResources && allResources.length > 0) {
        resourcesContext = `\n\nLearning Resources:\n${allResources
          .slice(0, 5)
          .map(
            (r: any, idx: number) =>
              `${idx + 1}. [${r.title}](${r.url}) - ${r.source.toUpperCase()}`,
          )
          .join("\n")}`;
      }
    } catch (error) {
      console.log("Resource fetching skipped, continuing without resources");
    }
    if (generationId) sendStageComplete(generationId, 3, "Resources gathered");

    // Stage 4: Final pass - Gemini optimization with Groq fallback
    console.log("Stage 4: Finalizing implementation...");
    // Pace to stay within Gemini free-tier rate limits
    console.log(`[Rate Limit] Waiting ${GEMINI_INTER_CALL_DELAY_MS / 1000}s before Stage 4 Gemini call...`);
    await sleep(GEMINI_INTER_CALL_DELAY_MS);
    checkCanceled();
    if (generationId)
      sendStageStart(generationId, 4, "Finalizing implementation");
    if (generationId)
      sendProgressDetail(
        generationId,
        "Optimizing pseudocode and flow diagrams...",
      );

    let finalResult;

    try {
      console.log("Stage 4: Attempting Gemini optimization...");
      const finalPassResponse = await withRateLimitRetry(
        () => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are finalizing an educational implementation guide. Your job is to polish the content while PRESERVING and where needed EXPANDING it — never shorten or condense.

RULES:
- Do NOT remove, shorten, summarize, or condense any existing content.
- Where a step is missing detail that a user genuinely needs, add it.
- Only add content that is actually necessary — no filler.
- Fix typos, grammar, and clarity issues.
- Integrate any learning resources into relevant steps naturally.

PRESERVE this structure:
1. "BEFORE YOU BEGIN:" section
2. "QUICK START (Advanced Users):" section
3. "--- Section Name ---" dividers
4. Code snippet examples
5. Step-by-step verification prompts

Enhance:
1. Pseudocode — clear, educational, proper variable names and logic flow
2. Flow diagram — all decision points, loops, and error paths shown
3. Components — purpose and interactions explained
4. Instructions — improve clarity/flow only; expand where genuinely incomplete
5. Integrate learning resources at the relevant points in the instructions

Return ONLY valid JSON with keys: code, pseudocode, flowDiagram, instructions. Return nothing else.`,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              code: { type: "string" },
              pseudocode: { type: "string" },
              flowDiagram: { type: "string" },
              instructions: { type: "string" },
            },
            required: ["code", "pseudocode", "flowDiagram", "instructions"],
          },
        },
        contents: `Finalize this implementation. Do NOT shorten any section — only polish and expand where genuinely needed:\n\nCode:\n${geminiEnhancedResult.code}\n\nPseudocode:\n${geminiEnhancedResult.pseudocode}\n\nFlow Diagram:\n${geminiEnhancedResult.flowDiagram}\n\nInstructions:\n${geminiEnhancedResult.instructions}${resourcesContext}`,
        }),
        "Stage 4 Gemini",
        4,
        generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
      );
      checkCanceled();

      const finalJson = finalPassResponse.text || "";
      if (!finalJson) {
        throw new Error("Empty response from Gemini final pass");
      }

      finalResult = JSON.parse(finalJson);
      console.log("✅ Stage 4: Gemini optimization successful");
      if (generationId)
        sendProgressDetail(generationId, "Gemini finalization complete");
    } catch (geminiError) {
      if (geminiError instanceof Error && geminiError.message === "Generation canceled by user") throw geminiError;
      console.error(
        "❌ Stage 4: Gemini failed, falling back to Groq:",
        geminiError,
      );
      if (generationId)
        sendProgressDetail(
          generationId,
          "Gemini unavailable, using Groq for finalization",
        );

      // Fallback to Groq for Stage 4
      const groqStage4Response = await withRateLimitRetry(
        () => groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are finalizing an educational implementation guide for the project: "${preview.projectName}" (${preview.language} / ${preview.tool}).
IMPORTANT: Only polish and refine the content provided. Do NOT replace it with a different project. Do NOT shorten, condense, or summarize any section.

PRESERVE this structure:
1. "BEFORE YOU BEGIN:" section
2. "QUICK START (Advanced Users):" section
3. "--- Section Name ---" dividers
4. Code snippet examples
5. Step verification prompts

Enhance:
- Pseudocode: clear, educational, proper variable names
- Flow diagram: all decision points, loops, alternatives shown
- Components: explained with purpose and interactions
- Instructions: PRESERVE all content, expand where genuinely incomplete, improve clarity only
- Integrate learning resources into relevant instruction sections naturally

Fix grammar, improve transitions, ensure every genuinely needed step is fully written out.
Return ONLY valid JSON with keys: code, pseudocode, flowDiagram, instructions.`,
            },
            {
              role: "user",
              content: `Please finalize this implementation:\n\nCode:\n${geminiEnhancedResult.code}\n\nPseudocode:\n${geminiEnhancedResult.pseudocode}\n\nFlow Diagram:\n${geminiEnhancedResult.flowDiagram}\n\nInstructions:\n${geminiEnhancedResult.instructions}${resourcesContext}`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          max_tokens: 16000,
        }),
        "Stage 4 Groq",
        4,
        generationId ? (msg: string) => sendProgressDetail(generationId!, msg) : undefined,
      );
      checkCanceled();

      const groqFinalText =
        groqStage4Response.choices[0]?.message?.content?.trim() || "";
      try {
        finalResult = extractValidJSON(groqFinalText);
        console.log("✅ Stage 4: Groq fallback successful");
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message === "Generation canceled by user") throw parseError;
        console.error(
          "❌ Stage 4: Failed to parse Groq response, using Stage 2 result:",
          parseError,
        );
        if (generationId)
          sendProgressDetail(
            generationId,
            "Using previous results for finalization",
          );
        finalResult = geminiEnhancedResult;
      }
    }

    if (generationId)
      sendProgressDetail(generationId, "Gemini finalization complete");

    // Final step: Format instructions for clean visual display (remove Markdown, clean syntax)
    console.log("Stage 4.5: Formatting instructions for visual display...");
    // Pace before the Groq formatting call (Groq free-tier has low TPM limits)
    console.log(`[Rate Limit] Waiting ${GROQ_INTER_CALL_DELAY_MS / 1000}s before Stage 4.5 Groq formatting call...`);
    await sleep(GROQ_INTER_CALL_DELAY_MS);
    checkCanceled();
    if (generationId)
      sendProgressDetail(generationId, "Cleaning up visual formatting...");
    if (finalResult.instructions) {
      try {
        finalResult.instructions = await formatInstructionsForDisplay(
          finalResult.instructions,
        );
        console.log("✅ Stage 4.5: Instructions formatting complete");
      } catch (err) {
        console.error(
          "Formatting step failed, using unformatted instructions:",
          err,
        );
      }
    }

    if (generationId) sendStageComplete(generationId, 4, "Generation complete");
    return finalResult;
  } catch (error) {
    if (error instanceof Error && error.message === "Generation canceled by user") {
      console.log(`[AI] Gracefully handled cancellation for ${generationId}`);
      throw error;
    }
    console.error("Implementation generation failed:", error);
    throw new Error(`Failed to generate implementation: ${error}`);
  }
}

export interface TrendContent {
  title: string;
  content: string;
  source: string;
  relevanceToUser: string;
  relatedConcepts: string[];
  category: string;
}

export async function generateTrendContent(
  concepts: any[],
  personalization?: any,
): Promise<TrendContent[]> {
  const careerContext = personalization?.aspiringCareer || personalization?.currentCareer || "general industry";
  const industryContext = personalization?.targetIndustry || "Technology";

  const systemPrompt = `You are a visionary industry analyst and storyteller. Your goal is to write blog posts that are:
1. CAPTIVATING: Start with a hook, use a narrative tone, and avoid being overly dry or technical.
2. EDUCATIONAL: Balance the "cool factor" with technical depth so that after a month, the reader feels specialized in ${industryContext}.
3. CAREER-ALIGNED: Tailor the relevance to someone aspiring to be a ${careerContext}.
4. TREND-FOCUSED: Mention the latest 2024-2025 trends in ${industryContext}.

Return a JSON array of 2-4 blog objects:
{
  "title": "A catchy, non-boring title",
  "content": "A 300-500 word engaging blog post with sections. Focus on how a ${careerContext} can use this to grow. Use markdown.",
  "imageSearchQuery": "A descriptive query for a professional stock photo showing ${industryContext} in action",
  "source": "Industry Insight",
  "category": "${industryContext}",
  "relevanceToUser": "Specifically how this trend accelerates your path to becoming a specialized ${careerContext}",
  "relatedConcepts": ["Concept Name"]
}`;

  const learningHistory = concepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} (${c.category})`,
    )
    .join("\n");

  const contextMessage = `LEARNER CONTEXT:
Career: ${careerContext}
Industry: ${industryContext}
Learning Path:
${learningHistory}

Generate 2-4 specialized blog-style trends that prepare them for the real-world shifts in their field.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: contextMessage,
    });

    const rawJson = response.text;
    const trends = JSON.parse(rawJson || "[]");
    
    return trends.map((trend: any) => ({
      ...trend,
      imageUrl: `https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}&description=${encodeURIComponent(trend.imageSearchQuery || trend.title)}` 
    }));
  } catch (error) {
    console.error("Trend generation failed:", error);
    return [];
  }
}

export interface KnowledgeGap {
  area: string;
  missingConcepts: string[];
  suggestedResources: {
    type: string;
    description: string;
  }[];
  importance: string;
}

export async function analyzeKnowledgeGaps(
  concepts: any[],
): Promise<KnowledgeGap[]> {
  if (concepts.length === 0) {
    return [];
  }

  const systemPrompt = `You are an educational AI that identifies knowledge gaps and learning opportunities based on a user's specific learning journey.
Analyze the user's concepts and identify areas where deeper understanding would help them solve real-world problems better.

For each gap, provide:
- Area of knowledge with gaps (based on what they've learned)
- Specific missing concepts that would help (not generic, but relevant to THEIR path)
- Suggested learning resources (practical, applicable to their interests)
- Why this gap matters (explain how it connects to their learning and future projects)

PERSONALIZATION: Focus on gaps that are relevant to THEIR specific learning journey and real-world applications they care about.

Return JSON array of knowledge gaps (2-4 most relevant).`;

  const learningProfile = concepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} (${c.category}): ${c.what}\n   Real applications: ${c.where.join(", ")}`,
    )
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              missingConcepts: {
                type: "array",
                items: { type: "string" },
              },
              suggestedResources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
              importance: { type: "string" },
            },
          },
        },
      },
      contents: `User's learning profile:\n${learningProfile}\n\nIdentify knowledge gaps and learning opportunities.`,
    });

    const rawJson = response.text;
    if (!rawJson) {
      return [];
    }

    const gaps = JSON.parse(rawJson);
    return Array.isArray(gaps) ? gaps : [];
  } catch (error) {
    console.error(
      "Gemini knowledge gap analysis failed, falling back to Groq:",
      error,
    );

    // Fallback to Groq
    const groqResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            systemPrompt +
            "\n\nReturn ONLY a valid JSON array with objects containing: area, missingConcepts, suggestedResources, importance. Return nothing else.",
        },
        {
          role: "user",
          content: `User's learning profile:\n${learningProfile}\n\nIdentify knowledge gaps and learning opportunities.`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText =
      groqResponse.choices[0]?.message?.content?.trim() || "";

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      const gaps = JSON.parse(jsonMatch[0]);
      return Array.isArray(gaps) ? gaps : [];
    } catch {
      return [];
    }
  }
}

export interface OpportunityProject {
  id: string;
  projectName: string;
  type: string;
  difficulty: string;
  reasons: string[];
  prerequisites: string[];
  estimatedTime: string;
  locationContext?: string;
  problemType?: string;
}

export async function generateOpportunityProjects(
  concepts: any[],
  userLocation?: string,
  userGoals?: string[],
  userIdeas?: string[],
): Promise<OpportunityProject[]> {
  if (concepts.length === 0) {
    return [];
  }

  const ideasSection = userIdeas && userIdeas.length > 0
    ? `\nUser's existing ideas (BACKGROUND ONLY — do NOT replicate or closely mirror these; use them at most as distant inspiration to avoid repetition):\n${userIdeas.map((idea, i) => `  ${i + 1}. ${idea}`).join("\n")}`
    : "";

  const systemPrompt = `You are a "Community Solutions Architect". Your goal is to create SIMPLE, meaningful project opportunities that solve everyday real-world problems by directly applying the user's recently learned concepts.

PRIORITY ORDER (strictly follow this):
1. PRIMARY — Learned concepts: Every project MUST be directly derived from and clearly demonstrate the user's learned concepts. The project must not make sense without those concepts.
2. SECONDARY — Location & career goals: Use these to ground and personalise the project in the user's real-world context.
3. LOW PRIORITY — User's own ideas: The user's existing ideas are provided only so you can AVOID generating projects that are too similar to them. Do NOT replicate, re-skin, or closely mirror those ideas. Generate projects that feel clearly different and novel relative to the user's ideas.

Rules:
1. CONCEPTS FIRST: Each project must be unmistakably rooted in one or more of the user's learned concepts. The connection must be explicit and central — not incidental.
2. MEANINGFUL & SIMPLE: Avoid technical jargon. Focus on practical utility for everyday life.
3. EVERYDAY PROBLEMS: Solve issues someone might face at home, in their neighbourhood, or at a local small business.
4. SPECIALIZATION: If a user location is provided (${userLocation || "not provided"}), anchor projects in that local context.
5. CAREER ALIGNMENT: Incorporate the user's career goals (${userGoals?.join(", ") || "none provided"}) as a secondary framing layer.
6. NOVELTY vs IDEAS: The user's existing ideas are background context only. Generated projects must feel meaningfully different from any listed ideas.
7. ACTIONABLE: The user should feel they can deliver a great solution simply by applying what they've learnt.

For each project return:
- projectName: Catchy, simple name
- type: Simple category
- difficulty: beginner/intermediate/advanced
- reasons: 2-3 bullet points on why this is a great "Opportunity" to solve a real problem using their specific learned concepts.
- prerequisites: Simple list of skills needed
- estimatedTime: e.g., "2-4 hours"
- problemType: always "everyday"
- locationContext: How this relates to their current area (if applicable)

Return exactly 2 projects in a JSON array.`;

  const learningProfile = concepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.title}: Learned ${c.what.substring(0, 80)}...`,
    )
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: {
            type: "object",
            properties: {
              projectName: { type: "string" },
              type: { type: "string" },
              difficulty: { type: "string" },
              reasons: {
                type: "array",
                items: { type: "string" },
              },
              prerequisites: {
                type: "array",
                items: { type: "string" },
              },
              estimatedTime: { type: "string" },
              locationContext: { type: "string" },
              problemType: { type: "string" },
            },
            required: ["projectName", "type", "difficulty", "reasons", "prerequisites", "estimatedTime", "locationContext", "problemType"],
          },
        },
      },
      contents: `USER'S LEARNING JOURNEY (PRIMARY — build projects around these):
${learningProfile}

Location: ${userLocation || "General"}
Goals: ${userGoals?.join(", ") || "General application"}${ideasSection}`,
    });

    const rawJson = response.text;
    console.log("[DEBUG] Gemini Opportunity Projects Raw Response:", rawJson);
    if (!rawJson) throw new Error("Empty response from Gemini");
    return JSON.parse(rawJson);
  } catch (error) {
    console.error("Opportunity generation failed in Gemini:", error);
    try {
      console.log("[DEBUG] Attempting Groq fallback for Opportunity Projects");
      const groqResponse = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Learning Journey (PRIMARY):\n${learningProfile}\nLocation: ${userLocation}\nGoals: ${userGoals?.join(", ")}${ideasSection}` },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
      const groqContent = groqResponse.choices[0]?.message?.content || "[]";
      console.log("[DEBUG] Groq Opportunity Projects Raw Response:", groqContent);
      const result = extractValidJSON(groqContent);
      return Array.isArray(result) ? result : (result.projects || []);
    } catch (fallbackError) {
      console.error("Groq fallback for Opportunity Projects failed:", fallbackError);
      return [];
    }
  }
}

export async function regenerateFlowDiagram(implementation: {
  projectName: string;
  code?: string | null;
  pseudocode?: string | null;
  problemAddressed?: string | null;
}): Promise<string> {
  const context = `Project: ${implementation.projectName}
Problem: ${implementation.problemAddressed || ""}
${implementation.pseudocode ? `Algorithm:\n${implementation.pseudocode}` : ""}
${implementation.code ? `Code (excerpt, first 800 chars):\n${implementation.code.substring(0, 800)}` : ""}`;

  const prompt = `Generate a Mermaid.js flowchart for the following project. Return ONLY valid JSON with a single "flowDiagram" field.

Rules:
- Start with "graph TD"
- Use ([Stadium]) for Start and End nodes
- Use [Rectangle] for process steps
- Use {Diamond} for decision/condition nodes
- Use [/Parallelogram/] for input/output steps
- Use clear single-letter or short IDs (A, B, C...)
- Do NOT use semicolons at end of lines
- Keep it concise: 6–12 nodes max

${context}

Return JSON: {"flowDiagram": "graph TD\\n  A([Start]) --> ..."}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { flowDiagram: { type: "string" } },
          required: ["flowDiagram"],
        },
      },
      contents: prompt,
    });
    const text = response.text || "";
    const parsed = extractValidJSON(text);
    if (parsed?.flowDiagram) return parsed.flowDiagram;
    throw new Error("No flowDiagram in response");
  } catch (geminiErr) {
    console.error("Gemini flow regeneration failed, trying Groq:", geminiErr);
    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const text = groqResponse.choices[0]?.message?.content || "";
    const parsed = extractValidJSON(text);
    if (parsed?.flowDiagram) return parsed.flowDiagram;
    throw new Error("Both AI providers failed to generate flowDiagram");
  }
}

export interface ProjectPreferenceChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ExtractedProjectPreferences {
  preferredComplexity?: "beginner" | "intermediate" | "advanced";
  preferredApproach?: "simulation" | "code" | "theory" | "mixed";
  preferredTools?: string[];
  topicLean?: string;
  additionalNotes?: string;
  confidenceLevel: number;
  isReadyToGenerate: boolean;
}

export async function chatForProjectPreferences(
  conceptTitle: string,
  conceptCategory: string,
  conversationHistory: ProjectPreferenceChatMessage[],
  existingPersonalization?: any
): Promise<{ reply: string; extractedPreferences: ExtractedProjectPreferences }> {
  const systemPrompt = `You are a friendly project advisor inside an AI learning platform. A student wants to generate a NEW implementation project for a concept they are studying: "${conceptTitle}" (category: ${conceptCategory}).

They already had a previous project generated and want something different. Your job is to have a SHORT, friendly conversation (2-4 exchanges max) to understand what they want in the new project. Ask about ONE thing at a time naturally.

Cover these topics across the conversation (don't ask all at once):
1. Complexity level — do they want something simple/beginner, moderate, or challenging/advanced?
2. Direction/lean — should it lean toward simulation/visualization, writing code from scratch, theory/math, or a mix?
3. Preferred tools or languages (if any) — e.g. Python, MATLAB, JavaScript, etc.
4. Any specific angle or topic they want to explore within "${conceptTitle}"

Keep replies SHORT (2-3 sentences max). Be conversational. Once you feel you have enough info (after 2-4 exchanges), end your reply with exactly this line on a new line:
[READY_TO_GENERATE]

Their existing preferences (treat as soft hints, not requirements):
${existingPersonalization ? JSON.stringify(existingPersonalization) : "None yet"}

Also, in EVERY response, include a JSON block at the very end (after [READY_TO_GENERATE] if present) in this format:
<PREFS>
{"preferredComplexity":"intermediate","preferredApproach":"code","preferredTools":["Python"],"topicLean":"","additionalNotes":"","confidenceLevel":0.5,"isReadyToGenerate":false}
</PREFS>

Update the JSON with what you've learned so far. confidenceLevel goes from 0 to 1. isReadyToGenerate is true only when you include [READY_TO_GENERATE].`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content }))
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.75,
  });

  const rawReply = response.choices[0]?.message?.content || "I'd love to help you shape your next project! What complexity level are you aiming for — beginner, intermediate, or something more advanced?";

  const prefsMatch = rawReply.match(/<PREFS>([\s\S]*?)<\/PREFS>/);
  let extracted: ExtractedProjectPreferences = {
    confidenceLevel: 0,
    isReadyToGenerate: false
  };

  if (prefsMatch) {
    try {
      const parsed = JSON.parse(prefsMatch[1].trim());
      extracted = { ...extracted, ...parsed };
    } catch (e) {
    }
  }

  const cleanReply = rawReply
    .replace(/<PREFS>[\s\S]*?<\/PREFS>/g, "")
    .replace(/\[READY_TO_GENERATE\]/g, "")
    .trim();

  extracted.isReadyToGenerate = rawReply.includes("[READY_TO_GENERATE]");

  return { reply: cleanReply, extractedPreferences: extracted };
}

// ==================== IDEA BUILDER ====================

export async function chatAboutIdea(
  chatHistory: { role: "user" | "assistant"; content: string }[],
  userConcepts: any[],
  personalization?: any,
  isRefining?: boolean
): Promise<{ reply: string; isReadyToAnalyze: boolean; ideaSummary: string }> {
  const knowledgeContext = userConcepts.length > 0
    ? `The user has studied: ${userConcepts.map(c => `${c.title} (${c.category})`).join(", ")}.`
    : "The user is new and hasn't logged any concepts yet.";

  const careerContext = personalization?.careerGoals?.join(", ") || personalization?.aspiringCareer || "not specified";

  const refineInstruction = isRefining
    ? `\n\nIMPORTANT: The user is currently REFINING an existing idea. They have already described their idea earlier in the conversation. Your job now is to engage with any changes or additions they want to make. Do NOT output [READY_TO_ANALYZE] yet — only do so after the user explicitly says they are done refining or says something like "that's it", "I'm done", or "looks good". Keep asking follow-up questions about their refinements.`
    : "";

  const systemPrompt = `You are a friendly project advisor inside a learning platform. A user wants to build something — an app, tool, system, or solution to a problem. Your job is to understand their idea through a SHORT conversation (2-4 exchanges max).

User's existing knowledge: ${knowledgeContext}
Their career goals: ${careerContext}

Ask ONE focused question at a time to understand:
1. What they want to build and why
2. Who will use it or benefit from it
3. Any specific constraints or preferences (language, platform, scale, etc.)

Keep replies SHORT (2-3 sentences max). Be encouraging and conversational. Do NOT ask all questions at once.

Once you have enough understanding (after 2-4 exchanges), end your reply with [READY_TO_ANALYZE] on a new line, and include a one-sentence idea summary in this format:
<IDEA_SUMMARY>concise description of what they want to build</IDEA_SUMMARY>${refineInstruction}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory,
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.75,
    max_tokens: 300,
  });

  const rawReply = response.choices[0]?.message?.content?.trim() ||
    "Great! I'd love to help you build something meaningful. What problem are you trying to solve, or what's the idea you have in mind?";

  const isReadyToAnalyze = rawReply.includes("[READY_TO_ANALYZE]");
  const summaryMatch = rawReply.match(/<IDEA_SUMMARY>([\s\S]*?)<\/IDEA_SUMMARY>/);
  const ideaSummary = summaryMatch ? summaryMatch[1].trim() : "";

  const cleanReply = rawReply
    .replace(/\[READY_TO_ANALYZE\]/g, "")
    .replace(/<IDEA_SUMMARY>[\s\S]*?<\/IDEA_SUMMARY>/g, "")
    .trim();

  const finalReply = cleanReply || (isReadyToAnalyze
    ? "I think we have a great picture of your idea! Feel free to add any final details, or click \"skip to readiness check\" to continue."
    : "Tell me more about what you have in mind.");

  return { reply: finalReply, isReadyToAnalyze, ideaSummary };
}

export interface IdeaReadinessAnalysis {
  projectName: string;
  projectType: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  requiredSkills: string[];
  alreadyHas: { skill: string; matchedConcept: string }[];
  missing: {
    skill: string;
    importance: "essential" | "helpful" | "optional";
    resources: { type: string; title: string; url: string }[];
  }[];
  readinessScore: number;
  summary: string;
}

export async function analyzeIdeaReadiness(
  ideaSummary: string,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  userConcepts: any[],
  personalization?: any
): Promise<IdeaReadinessAnalysis> {
  const conversationContext = chatHistory
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join("\n");

  const knowledgeBase = userConcepts.map(c => ({
    title: c.title,
    category: c.category,
    tags: c.tags || [],
  }));

  const careerContext = personalization?.careerGoals?.join(", ") || "general learner";

  const systemPrompt = `You are an expert project advisor. Analyze a user's project idea and their current knowledge to determine readiness.

USER'S IDEA: ${ideaSummary}

CONVERSATION CONTEXT:
${conversationContext}

USER'S KNOWLEDGE BASE (concepts they've already studied):
${JSON.stringify(knowledgeBase, null, 2)}

CAREER GOALS: ${careerContext}

Your job:
1. Define a clear project scope (name, type, description, difficulty, estimated hours)
2. List all required skills to build this project
3. For each required skill, check if the user's knowledge base covers it — populate alreadyHas
4. For skills they're missing, provide 1-2 learning resources. IMPORTANT URL rules:
   - ONLY use these guaranteed-valid URL formats:
     * YouTube search: https://www.youtube.com/results?search_query=SKILL+tutorial (encode spaces as +)
     * Google/docs search: https://www.google.com/search?q=SKILL+tutorial+site%3Amdn.mozilla.org or site%3Afreecodecamp.org (encode spaces as +)
   - NEVER invent or guess direct URLs to specific videos, articles, or pages — they will be broken links.
   - For the title field, write a descriptive label like "YouTube: DC Motor Control tutorial" or "MDN docs: Async/Await" so users know what they're clicking.
5. Calculate readinessScore (0-100) based on the proportion of required skills they already have
6. Write a one-sentence summary of what the project will achieve

Be specific and practical. Match existing knowledge generously — if a concept is closely related, count it.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            projectType: { type: "string" },
            description: { type: "string" },
            difficulty: { type: "string" },
            estimatedHours: { type: "number" },
            requiredSkills: { type: "array", items: { type: "string" } },
            alreadyHas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  matchedConcept: { type: "string" },
                },
                required: ["skill", "matchedConcept"],
              },
            },
            missing: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  importance: { type: "string" },
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        title: { type: "string" },
                        url: { type: "string" },
                      },
                      required: ["type", "title", "url"],
                    },
                  },
                },
                required: ["skill", "importance", "resources"],
              },
            },
            readinessScore: { type: "number" },
            summary: { type: "string" },
          },
          required: ["projectName", "projectType", "description", "difficulty", "estimatedHours", "requiredSkills", "alreadyHas", "missing", "readinessScore", "summary"],
        },
      },
      contents: `Analyze this project idea and return a complete readiness report: "${ideaSummary}"`,
    });

    return JSON.parse(response.text || "{}") as IdeaReadinessAnalysis;
  } catch (geminiErr) {
    console.error("Gemini idea analysis failed, trying Groq:", geminiErr);
    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt + `

CRITICAL INSTRUCTIONS:
- You MUST return a complete, valid JSON object.
- projectName must be a real descriptive name for this specific project (NOT "Your Project").
- projectType must describe the actual type (NOT "Application" as a placeholder — be specific, e.g. "Mobile App", "Web Dashboard", "CLI Tool").
- description must be a detailed 2-3 sentence description of exactly what will be built.
- requiredSkills must list ALL specific technical skills needed (minimum 4-8 skills).
- alreadyHas must list every skill from requiredSkills that matches anything in the user's knowledge base.
- missing must list every required skill NOT in the knowledge base, each with 1-2 learning resources.
- Do NOT use placeholder text. Analyze the actual idea provided.`,
        },
        {
          role: "user",
          content: `Analyze this project idea and return detailed JSON: "${ideaSummary}"\n\nUser conversation context:\n${conversationContext}\n\nUser knowledge base: ${JSON.stringify(knowledgeBase)}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });
    return extractValidJSON(groqResponse.choices[0]?.message?.content || "{}") as IdeaReadinessAnalysis;
  }
}
