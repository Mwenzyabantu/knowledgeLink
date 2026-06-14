import {
  callGemini,
  errorResponse,
  extractJSON,
  jsonResponse,
  logger,
  optionsResponse,
  requireFields,
  ValidationError,
} from '../_shared/utils.ts'

// ===== HANDLERS =====

async function generateChatResponse(data: Record<string, unknown>) {
  requireFields(data, ['lastMessage'])

  const { concept, chatHistory = [], lastMessage, type = 'concept_clarification' } = data
  logger.info('generateChatResponse', 'Generating chat response', { type, historyLength: (chatHistory as any[]).length })

  const isProject = type === 'project_support'
  const systemContext = isProject
    ? 'You are an expert project mentor helping a student implement a technical project. Give specific, practical advice.'
    : 'You are an encouraging AI tutor helping a student deeply understand a concept. Use analogies and examples.'

  const prompt = `${systemContext}

${concept ? `Concept context:\n${JSON.stringify(concept)}\n` : ''}
Conversation so far:
${(chatHistory as any[]).map((m: any) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}

Student: ${String(lastMessage).slice(0, 2000)}

Respond as the tutor. Be conversational, specific, and helpful. Do not repeat what was already said.`

  const text = await callGemini(prompt)
  return { response: text }
}

async function generateTags(data: Record<string, unknown>) {
  requireFields(data, ['content'])

  const { content, existingTags = [] } = data

  const prompt = `Suggest 3-5 concise tags for this conversation content.

Content: ${String(content).slice(0, 1000)}${(existingTags as string[]).length ? `\nExisting tags (avoid duplicates): ${(existingTags as string[]).join(', ')}` : ''}

Return ONLY a valid JSON array of strings. Example: ["machine learning", "Python", "neural networks"]`

  const text = await callGemini(prompt)
  return extractJSON<string[]>(text)
}

async function chatForProjectPreferences(data: Record<string, unknown>) {
  requireFields(data, ['lastMessage'])

  const { conversation = [], lastMessage } = data
  logger.info('chatForProjectPreferences', 'Chatting for project preferences')

  const prompt = `You are helping a learner discover their project preferences through friendly conversation. Ask about career goals, preferred programming tools, and learning style. Keep it natural — one question at a time.

Conversation so far:
${(conversation as any[]).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

User: ${String(lastMessage).slice(0, 1000)}

Respond with ONLY valid JSON:
{
  "response": "your conversational reply (ask one clear question to learn more)",
  "extractedPreferences": {
    "preferredComplexity": "beginner|intermediate|advanced|null",
    "preferredApproach": "simulation|code|theory|mixed|null",
    "preferredTools": ["tool1"],
    "topicLean": "topic area or null",
    "additionalNotes": "any other preferences noted",
    "confidenceLevel": 0.0
  }
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function chatAboutIdea(data: Record<string, unknown>) {
  requireFields(data, ['lastMessage'])

  const { ideaSummary = '', conversation = [], lastMessage } = data
  logger.info('chatAboutIdea', 'Brainstorming about idea')

  const prompt = `You are an enthusiastic brainstorming partner helping a learner refine and develop their project idea. Be encouraging and ask clarifying questions to make the idea more concrete.

Idea summary: ${String(ideaSummary).slice(0, 500)}

Conversation so far:
${(conversation as any[]).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

User: ${String(lastMessage).slice(0, 1000)}

Respond naturally as a brainstorm partner. Help them think through feasibility, tools, and scope.`

  const text = await callGemini(prompt)
  return { response: text }
}

async function analyzeIdeaReadiness(data: Record<string, unknown>) {
  requireFields(data, ['idea'])

  const { idea, conversation = [] } = data
  logger.info('analyzeIdeaReadiness', 'Analyzing idea readiness')

  const prompt = `Analyze whether this project idea has enough detail to be implemented now.

Idea: ${JSON.stringify(idea)}
Conversation context: ${JSON.stringify((conversation as any[]).slice(-5))}

Return ONLY valid JSON:
{
  "ready": true,
  "confidence": 0.85,
  "missingInfo": ["what information is still unclear"],
  "suggestedNextSteps": ["concrete next step"],
  "suggestedProject": {
    "title": "specific project title",
    "type": "simulation|code|prototype|analysis",
    "tool": "primary tool or framework",
    "language": "programming language",
    "problem": "the problem it solves",
    "why": "why this project is valuable"
  }
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

// ===== ROUTER =====
const handlers: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
  generateChatResponse,
  generateTags,
  chatForProjectPreferences,
  chatAboutIdea,
  analyzeIdeaReadiness,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  try {
    const body = await req.json()
    const { action, ...data } = body

    if (!action || typeof action !== 'string') {
      throw new ValidationError('Missing or invalid "action" field')
    }

    const handler = handlers[action]
    if (!handler) {
      return jsonResponse({ error: `Unknown action: ${action}`, code: 'UNKNOWN_ACTION', available: Object.keys(handlers) }, 400)
    }

    logger.info('router', `Handling action: ${action}`)
    const result = await handler(data)
    return jsonResponse(result)
  } catch (err) {
    return errorResponse(err)
  }
})
