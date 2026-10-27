const MODELS = {
  primary: "gemini-3.6-flash",
  fallback: "gemini-3.5-flash-lite",
} as const;

const KEY_NAMES = ["GEMINI_API_KEY_4", "GEMINI_API_KEY_3"] as const;
const GEMINI_KEY_TEST_NAMES = [
  "GEMINI_API_KEY_0",
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
] as const;
// Four sequential model/key attempts must stay below Supabase's Edge wall-clock limit.
const GEMINI_TIMEOUT_MS = 25_000;
const KEY_TEST_TIMEOUT_MS = 10_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class RequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

class GeminiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly providerStatus?: string,
    readonly providerDetails?: unknown,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

function summarizeProviderDetails(details: unknown) {
  if (!Array.isArray(details)) return undefined;
  const violations = details.flatMap((detail) => {
    if (!detail || typeof detail !== "object") return [];
    const fieldViolations = (detail as Record<string, unknown>).fieldViolations;
    if (!Array.isArray(fieldViolations)) return [];
    return fieldViolations.slice(0, 8).flatMap((violation) => {
      if (!violation || typeof violation !== "object") return [];
      const item = violation as Record<string, unknown>;
      return [{
        field: typeof item.field === "string" ? item.field.slice(0, 200) : undefined,
        description: typeof item.description === "string" ? item.description.slice(0, 300) : undefined,
      }];
    });
  });
  return violations.length ? violations : undefined;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJSON<T = unknown>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const object = cleaned.match(/\{[\s\S]*\}/);
    const array = cleaned.match(/\[[\s\S]*\]/);
    const candidate = object?.[0] || array?.[0];
    if (!candidate) throw new GeminiError("Gemini did not return valid JSON.", 502);
    return JSON.parse(candidate) as T;
  }
}

function jsonGenerationConfig(schema: Record<string, unknown>) {
  return {
    responseFormat: {
      text: {
        mimeType: "APPLICATION_JSON",
        schema,
      },
    },
  };
}

function configuredKeys() {
  return KEY_NAMES.flatMap((name) => {
    const value = Deno.env.get(name);
    return value ? [{ name, value }] : [];
  });
}

async function testGeminiApiKeys() {
  const results: Array<{
    keyName: string;
    status: string;
    httpStatus?: number;
    providerStatus?: string;
  }> = [];

  for (const keyName of GEMINI_KEY_TEST_NAMES) {
    const apiKey = Deno.env.get(keyName);
    if (!apiKey) {
      results.push({ keyName, status: "not_configured" });
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KEY_TEST_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.primary}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({ contents: [{ parts: [{ text: "HI" }] }] }),
        },
      );
      const payload = await response.json().catch(() => null) as {
        error?: { message?: unknown; status?: unknown };
      } | null;
      const providerStatus = typeof payload?.error?.status === "string"
        ? payload.error.status
        : undefined;
      const providerMessage = typeof payload?.error?.message === "string"
        ? payload.error.message.toLowerCase()
        : "";
      let status = "request_failed";

      if (response.ok) {
        status = "working";
      } else if (
        response.status === 401 ||
        providerStatus === "UNAUTHENTICATED" ||
        providerStatus === "API_KEY_INVALID" ||
        providerMessage.includes("api key not valid") ||
        providerMessage.includes("invalid api key")
      ) {
        status = "invalid_key";
      } else if (response.status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
        status = "quota_exhausted";
      } else if (response.status === 403 || providerStatus === "PERMISSION_DENIED") {
        status = "access_denied";
      } else if (response.status === 404) {
        status = "model_unavailable";
      }

      results.push({
        keyName,
        status,
        httpStatus: response.status,
        ...(providerStatus ? { providerStatus } : {}),
      });
    } catch (error) {
      results.push({
        keyName,
        status: error instanceof DOMException && error.name === "AbortError"
          ? "timeout"
          : "network_error",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const report = { model: MODELS.primary, results };
  console.info("Gemini API key smoke test results", report);
  return report;
}

function shouldTryNextKey(error: GeminiError) {
  return [401, 403, 429, 500, 502, 503, 504].includes(error.statusCode) ||
    ["RESOURCE_EXHAUSTED", "UNAUTHENTICATED", "PERMISSION_DENIED"].includes(error.providerStatus ?? "");
}

async function callGeminiWithKey(
  prompt: string,
  schema: Record<string, unknown>,
  model: string,
  apiKey: string,
) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonGenerationConfig(schema),
      }),
    });

    const payload = await response.json().catch(() => null) as {
      error?: { message?: unknown; status?: unknown; details?: unknown };
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    } | null;

    if (!response.ok) {
      const providerMessage = typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Gemini returned HTTP ${response.status}.`;
      const providerStatus = typeof payload?.error?.status === "string"
        ? payload.error.status
        : undefined;
      throw new GeminiError(
        providerMessage,
        response.status,
        providerStatus,
        summarizeProviderDetails(payload?.error?.details),
      );
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.find((part) => typeof part.text === "string")?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new GeminiError("Gemini returned an empty response.", 502);
    }
    return text;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError("Gemini request timed out.", 504);
    }
    throw new GeminiError("Could not reach Gemini.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(prompt: string, schema: Record<string, unknown>) {
  const keys = configuredKeys();
  if (keys.length === 0) {
    throw new RequestError(
      "Connect-the-Dots requires GEMINI_API_KEY_4 or GEMINI_API_KEY_3 in Supabase Function Secrets.",
      503,
    );
  }

  let lastError: GeminiError | undefined;
  for (const model of [MODELS.primary, MODELS.fallback]) {
    for (const key of keys) {
      try {
        return await callGeminiWithKey(prompt, schema, model, key.value);
      } catch (error) {
        if (!(error instanceof GeminiError)) throw error;
        lastError = error;
        console.warn("Connect-the-Dots Gemini attempt failed", {
          model,
          keyName: key.name,
          statusCode: error.statusCode,
          providerStatus: error.providerStatus,
          providerDetails: error.providerDetails,
        });
        if (!shouldTryNextKey(error)) break;
      }
    }
  }

  if (lastError) {
    throw new GeminiError(
      lastError.message,
      lastError.statusCode,
      lastError.providerStatus,
      lastError.providerDetails,
    );
  }
  throw new GeminiError("Gemini could not generate a response.", 502);
}

function connectText(data: Record<string, unknown>, key: string, maxLength: number) {
  const value = data[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new RequestError(`"${key}" must be a non-empty string under ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function connectTopics(value: unknown) {
  if (!Array.isArray(value) || value.length > 80) {
    throw new RequestError('"topics" must be a list of at most 80 topics.', 400);
  }
  const topics = value.map((topic) => {
    if (typeof topic !== "string" || !topic.trim() || topic.length > 300) {
      throw new RequestError("Each topic must be a non-empty string under 300 characters.", 400);
    }
    return topic.trim();
  });
  return [...new Map(topics.map((topic) => [topic.toLowerCase(), topic])).values()];
}

function connectContext(data: Record<string, unknown>) {
  return {
    career: connectText(data, "career", 160),
    program: connectText(data, "program", 180),
    courseName: connectText(data, "courseName", 180),
  };
}

const topicContributionSchema = {
  type: "object",
  properties: {
    topic: { type: "string" },
    origin: { type: "string", enum: ["learner", "ai-inferred"] },
    role: { type: "string" },
  },
  required: ["topic", "origin", "role"],
};

const applicationSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    relevantTopics: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "relevantTopics"],
};

const applicationsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 8,
  items: applicationSchema,
};

const overviewSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    summary: { type: "string" },
    systems: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          topicContributions: {
            type: "array",
            maxItems: 30,
            items: topicContributionSchema,
          },
        },
        required: ["title", "summary", "topicContributions"],
      },
    },
    applications: applicationsSchema,
  },
  required: ["summary", "systems", "applications"],
};

const useAssessmentSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    fitLevel: { type: "string", enum: ["strong", "partial", "weak"] },
    reasoning: { type: "string" },
    relevantConcepts: {
      type: "array",
      maxItems: 40,
      items: topicContributionSchema,
    },
    applications: applicationsSchema,
  },
  required: ["fitLevel", "reasoning", "relevantConcepts", "applications"],
};

const biggerPictureSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    title: { type: "string" },
    overview: { type: "string" },
    topicContributions: {
      type: "array",
      maxItems: 40,
      items: topicContributionSchema,
    },
    systemFlow: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          step: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          topics: { type: "array", items: { type: "string" } },
        },
        required: ["step", "title", "description", "topics"],
      },
    },
    endToEndExample: {
      type: "object",
      properties: {
        title: { type: "string" },
        steps: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } },
      },
      required: ["title", "steps"],
    },
  },
  required: ["title", "overview", "topicContributions", "systemFlow", "endToEndExample"],
};

const researchSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          sourceUrl: { type: "string" },
          sourceName: { type: "string" },
        },
        required: ["title", "summary", "sourceUrl", "sourceName"],
      },
    },
  },
  required: ["findings"],
};

async function generateConnectDotsOverview(data: Record<string, unknown>) {
  const context = connectContext(data);
  const topics = connectTopics(data.topics);
  if (topics.length === 0) {
    throw new RequestError("Add at least one course topic to map topics.", 400);
  }
  const prompt = `Build an educational map that connects the learner's supplied course topics to real systems and career-relevant applications.

Learner context: ${JSON.stringify(context)}
Learner-provided topics (the only items that may be labeled "learner"): ${JSON.stringify(topics)}

Return a concise summary, up to 8 systems, and 3-6 concrete applications. Explain how the supplied topics work together, not just one definition per topic. Every topic contribution must include its role and origin. Use origin "learner" only for exact or clearly equivalent supplied topics. Any additional concepts must use origin "ai-inferred" so the learner can distinguish them. Do not claim an inferred concept was taught in the course. Applications should be realistic and connect back to the supplied topics.`;

  return extractJSON(await callGemini(prompt, overviewSchema));
}

async function assessConnectDotsUse(data: Record<string, unknown>) {
  const context = connectContext(data);
  const topics = connectTopics(data.topics);
  const description = connectText(data, "description", 1000);
  const prompt = `Assess whether a learner's known use fits their course context. Do not require the learner to provide course topics; the list may be empty.

Course and career context: ${JSON.stringify(context)}
Saved learner-provided topics (may be empty): ${JSON.stringify(topics)}
Use the learner has in mind: ${description}

Choose fitLevel as strong, partial, or weak. Explain the match honestly; do not force a strong fit. Include relevant concepts with origin "learner" only for supplied topics and "ai-inferred" for any added concepts. Suggest 3-6 practical applications, including the learner's idea when appropriate. Label inferred concepts clearly in their origin.`;

  return extractJSON(await callGemini(prompt, useAssessmentSchema));
}

async function generateConnectDotsBiggerPicture(data: Record<string, unknown>) {
  const context = connectContext(data);
  const topics = connectTopics(data.topics);
  const knownUse = typeof data.knownUse === "string" ? data.knownUse.slice(0, 1000) : "";
  const application = data.application;
  if (!application || typeof application !== "object" || Array.isArray(application)) {
    throw new RequestError('"application" must be an application object.', 400);
  }
  const selectedApplication = application as Record<string, unknown>;
  const applicationTitle = connectText(selectedApplication, "title", 180);
  const applicationSummary = connectText(selectedApplication, "summary", 1000);
  const prompt = `Explain the complete system behind this learner-selected application. Show how course ideas work together, in an end-to-end sequence.

Course and career context: ${JSON.stringify(context)}
Learner-provided topics (may be empty): ${JSON.stringify(topics)}
Known-use context: ${knownUse || "Not provided"}
Selected application: ${JSON.stringify({ title: applicationTitle, summary: applicationSummary })}

Return a short overview, topic contributions with origin labels, an ordered systemFlow, and a small end-to-end example. Use origin "learner" only for supplied topics and "ai-inferred" for any concept you add. In each flow step, list the topic names that contribute. Do not present inferred concepts as course content. Make the output specific to the selected application rather than a generic topic summary.`;

  return extractJSON(await callGemini(prompt, biggerPictureSchema));
}

async function summarizeConnectDotsResearch(data: Record<string, unknown>) {
  const context = connectContext(data);
  const applicationTitle = connectText(data, "applicationTitle", 180);
  const query = connectText(data, "query", 240);
  if (!Array.isArray(data.sources) || data.sources.length > 12) {
    throw new RequestError('"sources" must contain at most 12 source records.', 400);
  }
  const sources = data.sources.map((source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new RequestError("Each source must be an object.", 400);
    }
    const item = source as Record<string, unknown>;
    return {
      title: connectText(item, "title", 240),
      url: connectText(item, "url", 2000),
      source: connectText(item, "source", 120),
      snippet: typeof item.snippet === "string" ? item.snippet.slice(0, 1200) : "",
    };
  });
  const prompt = `Summarize only the information supported by the provided source titles and excerpts. Do not use outside knowledge or invent dates, facts, authors, or citations. Return one concise finding per useful source (or fewer if an excerpt contains no usable information). For every finding, copy sourceUrl exactly from one input source URL and sourceName exactly from that source name. Keep summaries clear about what the excerpt does and does not establish.

Course/career context: ${JSON.stringify(context)}
Selected application: ${applicationTitle}
Research question: ${query}
Provided sources: ${JSON.stringify(sources)}`;

  return extractJSON(await callGemini(prompt, researchSchema));
}

const handlers: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
  testGeminiApiKeys,
  generateConnectDotsOverview,
  assessConnectDotsUse,
  generateConnectDotsBiggerPicture,
  summarizeConnectDotsResearch,
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body?.action;
    if (typeof action !== "string" || !action) {
      throw new RequestError('Missing or invalid "action" field.', 400);
    }
    const handler = handlers[action];
    if (!handler) {
      throw new RequestError(`Unknown Connect-the-Dots action: ${action}.`, 400);
    }
    const { action: _action, ...data } = body;
    return jsonResponse(await handler(data));
  } catch (error) {
    const status = error instanceof RequestError || error instanceof GeminiError
      ? error.statusCode
      : 500;
    const details = error instanceof Error ? error.message : "Unknown failure.";
    console.error("connect-the-dots-ai request failed", { status, details });
    const message = error instanceof RequestError
      ? error.message
      : "Connect-the-Dots AI generation failed.";
    return jsonResponse({ error: message }, status);
  }
});
