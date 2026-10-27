const KEY_NAMES = [
  "GEMINI_API_KEY_0",
  "GEMINI_API_KEY_1",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
] as const;

const MODELS = [
  { name: "gemini-2.5-flash", kind: "text" },
  { name: "gemini-3-flash-preview", kind: "text" },
  { name: "gemini-3.1-flash-lite-preview", kind: "text" },
  { name: "gemini-3.5-flash", kind: "text" },
  { name: "gemini-3.5-flash-lite", kind: "text" },
  { name: "gemini-3.5-transcribe", kind: "transcription" },
  { name: "gemini-3.6-flash", kind: "text" },
  { name: "gemini-3.8-flash-lite-tts", kind: "tts" },
  { name: "gemini-3.8-flash-tts", kind: "tts" },
  { name: "gemini-flash-lite-latest", kind: "text" },
  { name: "gemini-robotics-er-2-preview", kind: "text" },
] as const;

const REQUEST_TIMEOUT_MS = 10_000;
const USER_COOLDOWN_MS = 5 * 60 * 1000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const lastRunByUser = new Map<string, number>();
const activeUsers = new Set<string>();

type ModelKind = (typeof MODELS)[number]["kind"];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

function authenticatedUserId(request: Request): string | null {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "="));
    const claims = JSON.parse(decoded) as Record<string, unknown>;

    // Supabase's gateway verifies the JWT signature before the function runs.
    if (claims.role !== "authenticated" || typeof claims.sub !== "string") {
      return null;
    }
    return claims.sub;
  } catch {
    return null;
  }
}

function silentWavBase64(): string {
  const sampleRate = 16_000;
  const sampleCount = 1_600;
  const dataBytes = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);

  let binary = "";
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function requestBodyFor(kind: ModelKind, silentAudio: string) {
  if (kind === "tts") {
    return {
      contents: [{ parts: [{ text: "Say the word OK." }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    };
  }

  if (kind === "transcription") {
    return {
      contents: [{
        parts: [
          { text: "Transcribe this short audio. If there is no speech, reply SILENCE." },
          { inlineData: { mimeType: "audio/wav", data: silentAudio } },
        ],
      }],
      generationConfig: { maxOutputTokens: 8, temperature: 0 },
    };
  }

  return {
    contents: [{ parts: [{ text: "Reply with exactly OK." }] }],
    generationConfig: { maxOutputTokens: 4, temperature: 0 },
  };
}

function classifyResponse(status: number, providerStatus?: string): string {
  if (status >= 200 && status < 300) return "working";
  if (
    status === 401 ||
    providerStatus === "UNAUTHENTICATED" ||
    providerStatus === "API_KEY_INVALID"
  ) return "invalid_key";
  if (status === 403 || providerStatus === "PERMISSION_DENIED") {
    return "access_denied";
  }
  if (status === 404) return "model_unavailable";
  if (status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    return "quota_exhausted";
  }
  if (status === 400) return "request_rejected";
  if (status >= 500) return "provider_unavailable";
  return "request_failed";
}

async function probe(
  keyName: (typeof KEY_NAMES)[number],
  apiKey: string | undefined,
  model: (typeof MODELS)[number],
  silentAudio: string,
) {
  const startedAt = Date.now();
  const baseResult = {
    keyName,
    reservedForConnectTheDots: keyName === "GEMINI_API_KEY_4",
    model: model.name,
  };

  if (!apiKey) {
    return { ...baseResult, status: "not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.name)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify(requestBodyFor(model.kind, silentAudio)),
      },
    );

    const payload = await response.json().catch(() => null) as {
      error?: { status?: unknown };
    } | null;
    const providerStatus = typeof payload?.error?.status === "string"
      ? payload.error.status
      : undefined;

    return {
      ...baseResult,
      status: classifyResponse(response.status, providerStatus),
      httpStatus: response.status,
      ...(providerStatus ? { providerStatus } : {}),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ...baseResult,
      status: timedOut ? "timeout" : "network_error",
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST for a live diagnostic run." }, 405);
  }

  const userId = authenticatedUserId(request);
  if (!userId) {
    return jsonResponse({ error: "A signed-in Supabase user is required." }, 401);
  }

  const body = await request.json().catch(() => null) as
    | { confirmLiveTests?: unknown }
    | null;
  if (body?.confirmLiveTests !== true) {
    return jsonResponse({
      error: "Set confirmLiveTests to true to run the live Gemini probes.",
    }, 400);
  }

  const now = Date.now();
  const lastRun = lastRunByUser.get(userId);
  if (activeUsers.has(userId)) {
    return jsonResponse({ error: "A diagnostic run is already in progress." }, 409);
  }
  if (lastRun !== undefined && now - lastRun < USER_COOLDOWN_MS) {
    return jsonResponse({
      error: "Please wait before starting another diagnostic run.",
      retryAfterSeconds: Math.ceil((USER_COOLDOWN_MS - (now - lastRun)) / 1000),
    }, 429);
  }

  activeUsers.add(userId);
  lastRunByUser.set(userId, now);

  try {
    const keys = new Map(
      KEY_NAMES.map((name) => [name, Deno.env.get(name)] as const),
    );
    const silentAudio = silentWavBase64();
    const results = [];

    // One request per key at a time; model batches remain bounded at five calls.
    for (const model of MODELS) {
      const modelResults = await Promise.all(
        KEY_NAMES.map((keyName) =>
          probe(keyName, keys.get(keyName), model, silentAudio)
        ),
      );
      results.push(...modelResults);
    }

    const counts = results.reduce<Record<string, number>>((summary, result) => {
      summary[result.status] = (summary[result.status] ?? 0) + 1;
      return summary;
    }, {});
    const configuredKeyCount = [...keys.values()].filter(Boolean).length;

    console.info("Gemini key diagnostic completed", {
      configuredKeyCount,
      modelCount: MODELS.length,
      probeCount: results.length,
      statusCounts: counts,
    });

    return jsonResponse({
      probeType: "live-generation",
      configuredKeyCount,
      modelCount: MODELS.length,
      totalProbes: results.length,
      statusCounts: counts,
      results,
    });
  } finally {
    activeUsers.delete(userId);
  }
});
