import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const projectRoot = process.cwd();
const keyNames = [
  "GEMINI_API_KEY_0",
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
];

function makeEnv({ includeAllKeys = true } = {}) {
  const env = { YOUTUBE_API_KEY: "mock-youtube-key" };
  for (const [index, name] of keyNames.entries()) {
    if (includeAllKeys || index < 4) env[name] = `mock-gemini-key-${index}`;
  }
  return env;
}

async function loadEndpoint(name, env) {
  let handler;
  globalThis.Deno = {
    serve(callback) {
      handler = callback;
    },
    env: {
      get(key) {
        return env[key];
      },
    },
  };

  const result = await build({
    entryPoints: [path.join(projectRoot, "supabase", "functions", name, "index.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
  });
  const code = Buffer.from(result.outputFiles[0].contents).toString("base64");
  await import(`data:text/javascript;base64,${code}`);
  assert.equal(typeof handler, "function", `${name} should register a request handler`);
  return handler;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function schemaValue(schema = {}) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (schema.type === "object" || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, value]) => [
        key,
        schemaValue(value),
      ]),
    );
  }
  if (schema.type === "array") {
    const count = Math.max(1, schema.minItems ?? 1);
    return Array.from({ length: Math.min(count, 3) }, () => schemaValue(schema.items));
  }
  if (schema.type === "boolean") return true;
  if (schema.type === "integer") return 1;
  if (schema.type === "number") return 0.8;
  if (schema.type === "string") return "mock value";
  return null;
}

function mockText(prompt, schema) {
  if (schema) return JSON.stringify(schemaValue(schema));

  const lower = prompt.toLowerCase();
  if (lower.includes("extractedpreferences")) {
    return JSON.stringify({
      response: "Which tools do you prefer?",
      extractedPreferences: {
        preferredComplexity: "intermediate",
        preferredApproach: "mixed",
        preferredTools: ["Python"],
        topicLean: "engineering",
        additionalNotes: "",
        confidenceLevel: 0.8,
      },
    });
  }
  if (lower.includes('"ready": true')) {
    return JSON.stringify({
      ready: true,
      confidence: 0.8,
      missingInfo: [],
      suggestedNextSteps: ["Start with a prototype"],
      suggestedProject: {
        title: "Solar Monitor",
        type: "prototype",
        tool: "Python",
        language: "Python",
        problem: "Monitor solar output",
        why: "It applies the concept",
      },
    });
  }
  if (lower.includes('"title": "engaging article title"')) {
    return JSON.stringify({
      title: "Solar energy update",
      content: "A short source-aware learning update.",
      relevanceToUser: "It connects to solar energy.",
      relatedConcepts: ["solar energy"],
      category: "Energy",
    });
  }
  if (lower.includes('"projectname": "specific project name"')) {
    return JSON.stringify([{
      projectName: "Solar Output Monitor",
      difficulty: "beginner",
      estimatedTime: "4 hours",
      prerequisites: ["Python"],
      reasons: ["Applies solar energy concepts"],
      locationContext: "Suitable for local energy projects",
      problemType: "academic",
    }]);
  }
  if (lower.includes('"gaps": [{')) {
    return JSON.stringify({
      gaps: [],
      learningPattern: "practical-first",
      opportunityProjects: [],
    });
  }
  if (lower.includes('"learnerprofile"')) {
    return JSON.stringify({
      learnerProfile: "A practical learner who applies concepts.",
      strengths: ["Persistence"],
      areasForImprovement: ["Testing"],
      suggestedNextTopics: ["Data analysis"],
      engagementScore: 0.8,
    });
  }
  if (lower.includes('"bestfor"')) {
    return JSON.stringify([{
      tool: "Python",
      reason: "Good ecosystem",
      pros: ["Accessible"],
      cons: [],
      bestFor: "Rapid prototypes",
    }]);
  }
  if (lower.includes('"filtered"')) {
    return JSON.stringify({ filtered: ["new skill"], removed: ["known skill"] });
  }
  if (lower.includes('"selectedproject"')) {
    return JSON.stringify({
      selectedProject: { name: "Template project", type: "Application" },
      confidence: 0.8,
      reasoning: "It has a similar structure.",
    });
  }
  if (lower.includes('"convertedcode"')) {
    return JSON.stringify({
      convertedCode: "print('test')",
      pseudocode: "Print a test message.",
      notes: [],
    });
  }
  if (lower.includes('"learningcurve"')) {
    return JSON.stringify({
      valid: true,
      confidence: 0.8,
      reasoning: "The tool fits the project.",
      alternatives: [],
      learningCurve: "beginner",
      communitySupport: "high",
    });
  }
  if (lower.includes('"flowdiagram"')) {
    return JSON.stringify({ flowDiagram: "flowchart TD\n  A[Start] --> B[End]" });
  }
  if (lower.includes('"relevancescore"')) {
    return JSON.stringify([{ relevanceScore: 80, relevanceReason: "Matches the topic." }]);
  }
  if (lower.includes("valid json array of 6 strings")) {
    return JSON.stringify([
      "solar panel basics",
      "solar output examples",
      "solar theory",
      "solar implementation",
      "solar beginner guide",
      "solar advanced guide",
    ]);
  }
  if (lower.includes("suggest 3-5 concise tags")) {
    return JSON.stringify(["solar energy", "engineering"]);
  }
  return "Mocked Gemini response.";
}

function createMockFetch() {
  const calls = [];
  const state = { failModels: new Set(), failApiKeyStatuses: new Map() };

  const fetch = async (input, init = {}) => {
    const rawUrl = input instanceof URL
      ? input.toString()
      : typeof input === "string"
        ? input
        : input.url;
    const url = new URL(rawUrl);

    if (url.hostname === "generativelanguage.googleapis.com") {
      const requestHeaders = new Headers(init.headers);
      const apiKey = url.searchParams.get("key") ||
        requestHeaders.get("x-goog-api-key") ||
        "";
      const model = decodeURIComponent(
        url.pathname.match(/\/models\/([^/]+):generateContent$/)?.[1] ?? "",
      );
      const requestBody = typeof init.body === "string" ? JSON.parse(init.body) : {};
      calls.push({ apiKey, model, body: requestBody, endpoint: url.pathname });

      const keyFailure = state.failApiKeyStatuses.get(apiKey);
      const status = state.failModels.has(model) ? 503 : keyFailure;
      if (status) {
        return jsonResponse({
          error: {
            message: "Mock provider failure",
            status: status === 429 ? "RESOURCE_EXHAUSTED" : "UNAVAILABLE",
          },
        }, status);
      }

      const schema = requestBody.generationConfig?.responseFormat?.text?.schema;
      return jsonResponse({
        candidates: [{
          content: { parts: [{ text: mockText(requestBody.contents?.[0]?.parts?.[0]?.text ?? "", schema) }] },
        }],
      });
    }

    if (url.hostname === "api.crossref.org") {
      return jsonResponse({ message: { items: [] } });
    }

    if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/search") {
      return jsonResponse({
        items: [{
          id: { videoId: "mock-video-id" },
          snippet: {
            title: "Mock learning video",
            channelTitle: "Test Channel",
            description: "A mocked video result.",
            publishedAt: "2026-01-01T00:00:00Z",
            thumbnails: { medium: { url: "https://example.test/mock.jpg" } },
          },
        }],
      });
    }

    throw new Error(`Unexpected external request in test: ${url.hostname}${url.pathname}`);
  };

  return {
    calls,
    fetch,
    configure(options) {
      state.failModels = options.failModels ?? new Set();
      state.failApiKeyStatuses = options.failApiKeyStatuses ?? new Map();
    },
    resetCalls() {
      calls.length = 0;
    },
  };
}

function request(handler, body, { method = "POST", headers = {} } = {}) {
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  return handler(new Request("https://edge.test/function", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  }));
}

const actionSuites = {
  "ai-chat": [
    ["generateChatResponse", { lastMessage: "Explain solar energy.", chatHistory: [] }, (data) => assert.equal(typeof data.response, "string")],
    ["generateTags", { content: "Solar energy and photovoltaic cells." }, (data) => assert.ok(Array.isArray(data) && data.length > 0)],
    ["chatForProjectPreferences", { lastMessage: "I like Python.", conversation: [] }, (data) => assert.ok(data.extractedPreferences)],
    ["chatAboutIdea", { lastMessage: "Can this idea work?", ideaSummary: "A solar monitor", conversation: [] }, (data) => assert.equal(typeof data.response, "string")],
    ["analyzeIdeaReadiness", { idea: { title: "Solar monitor" }, conversation: [] }, (data) => assert.equal(typeof data.ready, "boolean")],
  ],
  "ai-generate": [
    ["generate5WH", { input: "Solar energy" }, (data) => assert.ok(data.title !== undefined)],
    ["generateImplementationPreview", { concept: { title: "Solar energy", category: "Science" } }, (data) => assert.ok(data.projectName !== undefined)],
    ["generateImplementationCode", { concept: { title: "Solar energy" }, projectType: "Application", tool: "Python", language: "Python" }, (data) => assert.ok(data.code !== undefined)],
    ["generateInlinePrompt", { concept: { title: "Solar energy" }, chatHistory: [] }, (data) => assert.equal(typeof data, "string")],
    ["generateTags", { content: "Solar energy and photovoltaic cells." }, (data) => assert.ok(Array.isArray(data) && data.length > 0)],
  ],
  "ai-insights": [
    ["generateTrendContent", { conceptTitles: ["Solar energy"], category: "Energy" }, (data) => assert.ok(Array.isArray(data) && data[0]?.title)],
    ["generateOpportunityProjects", { concepts: [{ title: "Solar energy" }] }, (data) => assert.ok(Array.isArray(data) && data.length > 0)],
    ["analyzeKnowledgeGaps", { concepts: [{ title: "Solar energy" }], completedProjects: [] }, (data) => assert.ok(Array.isArray(data.gaps))],
    ["generateDynamicInsights", { concepts: [{ title: "Solar energy", category: "Science" }] }, (data) => assert.equal(typeof data.learnerProfile, "string")],
    ["suggestToolAlternatives", { tool: "Python", projectType: "Dashboard" }, (data) => assert.ok(Array.isArray(data) && data.length > 0)],
    ["filterOutMasteredPrerequisites", { newPrerequisites: ["new skill"], masteredSkills: ["known skill"] }, (data) => assert.ok(Array.isArray(data.filtered))],
    ["selectBestProjectTemplate", { candidates: [{ projectName: "Template project" }], targetType: "Application", targetTool: "Python", targetLanguage: "Python" }, (data) => assert.ok(data.selectedProject)],
    ["convertImplementation", { code: "print(1)", fromTool: "Python", fromLanguage: "Python", toTool: "JavaScript", toLanguage: "JavaScript" }, (data) => assert.equal(typeof data.convertedCode, "string")],
    ["validateCustomTool", { tool: "Python", language: "Python", projectType: "Dashboard" }, (data) => assert.equal(typeof data.valid, "boolean")],
    ["regenerateFlowDiagram", { implementation: { projectName: "Solar monitor", instructions: "Measure output", code: "print(1)" } }, (data) => assert.equal(typeof data.flowDiagram, "string")],
    ["scoreResources", { resources: [{ title: "Solar basics", snippet: "Intro" }], concept: "Solar energy" }, (data) => assert.ok(Array.isArray(data) && typeof data[0]?.relevanceScore === "number")],
    ["generateResourceQueries", { concept: "Solar energy", category: "Science" }, (data) => assert.ok(Array.isArray(data) && data.length === 6)],
    ["fetchYouTubeVideos", { queries: ["solar energy", "photovoltaic cells"] }, (data) => assert.ok(Array.isArray(data.videos) && data.videos.length === 1)],
  ],
  "connect-the-dots-ai": [
    ["testGeminiApiKeys", {}, (data) => {
      assert.equal(data.results.length, 5);
      assert.ok(data.results.every((item) => item.status === "working"));
    }],
    ["generateConnectDotsOverview", { career: "Engineer", program: "Engineering", courseName: "Energy", topics: ["Solar energy"] }, (data) => assert.ok(data.summary)],
    ["assessConnectDotsUse", { career: "Engineer", program: "Engineering", courseName: "Energy", topics: ["Solar energy"], description: "Power a clinic with solar panels" }, (data) => assert.ok(data.fitLevel)],
    ["generateConnectDotsBiggerPicture", { career: "Engineer", program: "Engineering", courseName: "Energy", topics: ["Solar energy"], application: { title: "Clinic power", summary: "Solar power for a clinic" } }, (data) => assert.ok(data.title)],
    ["summarizeConnectDotsResearch", { career: "Engineer", program: "Engineering", courseName: "Energy", applicationTitle: "Clinic power", query: "Solar energy", sources: [{ title: "Solar study", url: "https://example.test/source", source: "Test journal", snippet: "A source excerpt." }] }, (data) => assert.ok(Array.isArray(data.findings))],
  ],
};

test("all Edge Function action routes work with mocked provider responses", async (t) => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [functionName, actions] of Object.entries(actionSuites)) {
      await t.test(functionName, async (t) => {
        const mock = createMockFetch();
        globalThis.fetch = mock.fetch;
        const endpoint = await loadEndpoint(functionName, makeEnv());

        for (const [action, payload, verify] of actions) {
          await t.test(action, async () => {
            mock.resetCalls();
            const response = await request(endpoint, { action, ...payload });
            const data = await response.json();
            assert.equal(response.status, 200, JSON.stringify(data));
            verify(data);
            if (action !== "fetchYouTubeVideos") {
              assert.ok(mock.calls.length > 0, `${functionName}/${action} should reach mocked Gemini`);
            }
          });
        }

        await t.test("OPTIONS preflight", async () => {
          const response = await request(endpoint, {}, { method: "OPTIONS" });
          assert.equal(response.status, 200);
          assert.equal(response.headers.get("access-control-allow-origin"), "*");
        });

        await t.test("unknown action returns 400", async () => {
          const response = await request(endpoint, { action: "missingAction" });
          assert.equal(response.status, 400);
        });
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared Gemini callers fall back between the tested text models", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const mock = createMockFetch();
    globalThis.fetch = mock.fetch;
    const endpoint = await loadEndpoint("ai-generate", makeEnv());

    mock.configure({ failModels: new Set(["gemini-3.6-flash"]) });
    const primaryFailure = await request(endpoint, {
      action: "generate5WH",
      input: "Solar energy",
    });
    assert.equal(primaryFailure.status, 200);
    assert.deepEqual(
      [...new Set(mock.calls.map((call) => call.model))],
      ["gemini-3.6-flash", "gemini-3.5-flash-lite"],
    );

    mock.resetCalls();
    mock.configure({ failModels: new Set(["gemini-3.5-flash-lite"]) });
    const fastFailure = await request(endpoint, {
      action: "generateTags",
      content: "Solar energy",
    });
    assert.equal(fastFailure.status, 200);
    assert.deepEqual(
      [...new Set(mock.calls.map((call) => call.model))],
      ["gemini-3.5-flash-lite", "gemini-3.6-flash"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Connect-the-Dots preserves key priority and model fallback", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const mock = createMockFetch();
    globalThis.fetch = mock.fetch;
    const endpoint = await loadEndpoint("connect-the-dots-ai", makeEnv());
    const body = {
      action: "generateConnectDotsOverview",
      career: "Engineer",
      program: "Engineering",
      courseName: "Energy",
      topics: ["Solar energy"],
    };

    mock.configure({
      failApiKeyStatuses: new Map([["mock-gemini-key-4", 429]]),
    });
    const keyFallback = await request(endpoint, body);
    assert.equal(keyFallback.status, 200);
    assert.deepEqual(
      mock.calls.slice(0, 2).map((call) => call.apiKey),
      ["mock-gemini-key-4", "mock-gemini-key-3"],
    );

    mock.resetCalls();
    mock.configure({ failModels: new Set(["gemini-3.6-flash"]) });
    const modelFallback = await request(endpoint, body);
    assert.equal(modelFallback.status, 200);
    assert.deepEqual(
      [...new Set(mock.calls.map((call) => call.model))],
      ["gemini-3.6-flash", "gemini-3.5-flash-lite"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gemini key-check auth, confirmation, matrix, and cooldown are enforced", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const mock = createMockFetch();
    globalThis.fetch = mock.fetch;
    const endpoint = await loadEndpoint("gemini-key-check", makeEnv());
    const anonymous = await request(endpoint, { confirmLiveTests: true });
    assert.equal(anonymous.status, 401);
    assert.equal(mock.calls.length, 0);

    const payload = Buffer.from(JSON.stringify({
      role: "authenticated",
      sub: "edge-test-user",
    })).toString("base64url");
    const authorization = `Bearer e30.${payload}.mock-signature`;
    const notConfirmed = await request(
      endpoint,
      { confirmLiveTests: false },
      { headers: { Authorization: authorization } },
    );
    assert.equal(notConfirmed.status, 400);
    assert.equal(mock.calls.length, 0);

    const response = await request(
      endpoint,
      { confirmLiveTests: true },
      { headers: { Authorization: authorization } },
    );
    const report = await response.json();
    assert.equal(response.status, 200, JSON.stringify(report));
    assert.equal(report.configuredKeyCount, 5);
    assert.equal(report.modelCount, 11);
    assert.equal(report.totalProbes, 55);
    assert.equal(report.statusCounts.working, 55);
    assert.equal(mock.calls.length, 55);
    assert.ok(!JSON.stringify(report).includes("mock-gemini-key-"));

    const cooldown = await request(
      endpoint,
      { confirmLiveTests: true },
      { headers: { Authorization: authorization } },
    );
    assert.equal(cooldown.status, 429);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
