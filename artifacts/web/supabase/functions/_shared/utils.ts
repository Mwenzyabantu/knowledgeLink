// ===== CONSTANTS =====
// Only Gemini 2.5 models are used. Flash is primary (faster/cheaper),
// Pro is fallback (more capable). No Groq/Llama — reliability over speed.
export const MODELS = {
  primary: 'gemini-2.5-flash',
  fallback: 'gemini-2.5-pro',
}

export const TIMEOUTS = {
  gemini: 90000, // 90s — allows time for backoff retry rounds
}

// ===== CORS =====
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ===== ERROR CLASSES =====
export class AIServiceError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class ValidationError extends AIServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details)
    this.name = 'ValidationError'
  }
}

export class APIError extends AIServiceError {
  constructor(message: string, statusCode = 503, details?: Record<string, unknown>) {
    super('API_ERROR', statusCode, message, details)
    this.name = 'APIError'
  }
}

export class TimeoutError extends AIServiceError {
  constructor(service: string) {
    super('TIMEOUT_ERROR', 504, `${service} request timed out`)
    this.name = 'TimeoutError'
  }
}

export class JSONParseError extends AIServiceError {
  constructor(raw: string) {
    super('JSON_PARSE_ERROR', 422, 'Failed to parse AI response as JSON', { raw: raw.slice(0, 500) })
    this.name = 'JSONParseError'
  }
}

// ===== LOGGER =====
export class Logger {
  private timers = new Map<string, number>()

  debug(action: string, message: string, metadata?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'debug', action, message, metadata, ts: new Date().toISOString() }))
  }
  info(action: string, message: string, metadata?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', action, message, metadata, ts: new Date().toISOString() }))
  }
  warn(action: string, message: string, metadata?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', action, message, metadata, ts: new Date().toISOString() }))
  }
  error(action: string, message: string, metadata?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', action, message, metadata, ts: new Date().toISOString() }))
  }
  startTimer(label: string) {
    this.timers.set(label, Date.now())
  }
  endTimer(label: string, action: string, metadata?: Record<string, unknown>) {
    const start = this.timers.get(label)
    if (start) {
      const duration = Date.now() - start
      this.info(action, `Completed in ${duration}ms`, { ...metadata, duration })
      this.timers.delete(label)
    }
  }
}

export const logger = new Logger()

// ===== JSON EXTRACTION =====
export function extractJSON<T = unknown>(text: string): T {
  const cleaned = text.trim()

  // 1. Direct parse
  try { return JSON.parse(cleaned) } catch { /* fall through */ }

  // 2. Strip markdown fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* fall through */ }
  }

  // 3. Extract first {...} object
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) } catch { /* fall through */ }
  }

  // 4. Extract first [...] array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch { /* fall through */ }
  }

  throw new JSONParseError(text)
}

// ===== GEMINI KEY POOL =====
// Loads all available Gemini API keys from Supabase Secrets.
// Keys are named GEMINI_API_KEY_0 through GEMINI_API_KEY_4.
// Falls back to GEMINI_API_KEY for backward compatibility.
function loadGeminiKeys(): string[] {
  const keys: string[] = []

  // Numbered keys take priority (0 through 4)
  for (let i = 0; i <= 4; i++) {
    const k = Deno.env.get(`GEMINI_API_KEY_${i}`)
    if (k) keys.push(k)
  }

  // Legacy single key as last-resort fallback
  const legacy = Deno.env.get('GEMINI_API_KEY')
  if (legacy && !keys.includes(legacy)) keys.push(legacy)

  return keys
}

const GEMINI_KEYS = loadGeminiKeys()

async function withTimeout<T>(promise: Promise<T>, ms: number, service: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(service)), ms),
  )
  return Promise.race([promise, timeout])
}

// ===== GEMINI CALLER WITH KEY ROTATION =====
// Tries each key in order. On a 429 (rate limit), moves to the next key.
// On other errors, throws immediately. Exhausting all keys throws the last error.
async function callGeminiWithKey(prompt: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new APIError(`Gemini ${model} error: ${res.status}`, res.status, { body: body.slice(0, 500) })
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new APIError('Gemini returned empty response', 502)
  return text
}

// Retry rounds: if all keys are rate-limited, wait then try again.
// Delays per round (after round 0): 2 s, 5 s.
// Small delay between individual key attempts to spread load.
const RETRY_ROUNDS = 3
const ROUND_WAIT_MS = [0, 2000, 5000]
const KEY_ROTATE_DELAY_MS = 400

async function callGeminiModel(prompt: string, model: string): Promise<string> {
  if (GEMINI_KEYS.length === 0) throw new APIError('No Gemini API keys configured', 503)

  let lastError: Error | null = null

  for (let round = 0; round < RETRY_ROUNDS; round++) {
    const roundWait = ROUND_WAIT_MS[round] ?? 5000
    if (roundWait > 0) {
      logger.info('callGeminiModel', `All keys rate-limited — waiting ${roundWait}ms before retry round ${round + 1}/${RETRY_ROUNDS}`, { model })
      await new Promise<void>(r => setTimeout(r, roundWait))
    }

    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      if (i > 0) {
        // Brief pause between key rotations so concurrent requests don't
        // hammer the next key at exactly the same millisecond
        await new Promise<void>(r => setTimeout(r, KEY_ROTATE_DELAY_MS))
      }
      try {
        const result = await callGeminiWithKey(prompt, model, GEMINI_KEYS[i])
        if (round > 0 || i > 0) {
          logger.info('callGeminiModel', `Succeeded on round ${round + 1}, key ${i}`, { model })
        }
        return result
      } catch (err) {
        const isRateLimit = err instanceof APIError && err.statusCode === 429
        if (isRateLimit) {
          logger.warn('callGeminiModel', `Key ${i} rate-limited (429)`, { model, round: round + 1, keyIndex: i })
          lastError = err as Error
          continue
        }
        throw err
      }
    }
  }

  throw new APIError(
    `All ${GEMINI_KEYS.length} Gemini keys rate-limited after ${RETRY_ROUNDS} rounds`,
    429,
    { triedKeys: GEMINI_KEYS.length, rounds: RETRY_ROUNDS, lastError: lastError?.message },
  )
}

export async function callGemini(prompt: string, model = MODELS.primary): Promise<string> {
  logger.startTimer('gemini')
  try {
    const result = await withTimeout(callGeminiModel(prompt, model), TIMEOUTS.gemini, 'Gemini')
    logger.endTimer('gemini', 'callGemini', { model })
    return result
  } catch (err) {
    if (err instanceof TimeoutError || !(err instanceof APIError)) throw err
    // Primary model failed — try the fallback (gemini-2.5-pro) with fresh retry rounds
    if (model === MODELS.primary) {
      logger.warn('callGemini', `Primary model (${model}) failed, trying fallback (${MODELS.fallback})`, { error: (err as Error).message })
      return withTimeout(callGeminiModel(prompt, MODELS.fallback), TIMEOUTS.gemini, 'Gemini')
    }
    throw err
  }
}

// ===== RESPONSE HELPERS =====
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AIServiceError) {
    return jsonResponse({ error: err.message, code: err.code, details: err.details }, err.statusCode)
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  logger.error('unhandled', message, { stack: err instanceof Error ? err.stack : undefined })
  return jsonResponse({ error: message, code: 'INTERNAL_ERROR' }, 500)
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders })
}

// ===== INPUT VALIDATION =====
export function requireFields(data: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter((f) => data[f] === undefined || data[f] === null)
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`)
  }
}
