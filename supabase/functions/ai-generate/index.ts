import {
  callGemini,
  corsHeaders,
  errorResponse,
  extractJSON,
  jsonResponse,
  logger,
  MODELS,
  optionsResponse,
  requireFields,
  ValidationError,
} from '../_shared/utils.ts'

// ===== HANDLERS =====

function jsonGenerationConfig(schema: Record<string, unknown>) {
  return {
    responseFormat: {
      text: {
        mimeType: 'application/json',
        schema,
      },
    },
  }
}

const fiveWHResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    category: { type: 'string' },
    problem: { type: 'string' },
    what: { type: 'string' },
    why: { type: 'string' },
    how: { type: 'string' },
    where: { type: 'array', items: { type: 'string' } },
    who: { type: 'string' },
    when: { type: 'string' },
    pseudocode: { type: 'string' },
  },
  required: ['title', 'category', 'problem', 'what', 'why', 'how', 'where', 'who', 'when'],
}

const implementationPreviewResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    projectName: { type: 'string' },
    type: { type: 'string' },
    tool: { type: 'string' },
    language: { type: 'string' },
    components: { type: 'array', items: { type: 'string' } },
    learningGoals: { type: 'array', items: { type: 'string' } },
    problemAddressed: { type: 'string' },
    whySuggested: { type: 'string' },
    realWorldContext: { type: 'string' },
    industry: { type: 'string' },
    flowDiagram: { type: 'string' },
  },
  required: [
    'projectName',
    'type',
    'tool',
    'language',
    'components',
    'learningGoals',
    'problemAddressed',
    'whySuggested',
    'realWorldContext',
    'industry',
    'flowDiagram',
  ],
}

const implementationCodeResponseSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    pseudocode: { type: 'string' },
    flowDiagram: { type: 'string' },
    instructions: { type: 'string' },
    learningGoals: { type: 'array', items: { type: 'string' } },
    expectedOutcomes: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'code',
    'pseudocode',
    'flowDiagram',
    'instructions',
    'learningGoals',
    'expectedOutcomes',
  ],
}

async function generate5WH(data: Record<string, unknown>) {
  requireFields(data, ['input'])
  const input = String(data.input).slice(0, 2000)

  logger.info('generate5WH', 'Generating 5W+H breakdown', { inputLength: input.length })

  const prompt = `Analyze this concept and return a JSON object with EXACTLY these fields:
{
  "title": "short concept title",
  "category": "subject category (e.g. Engineering, Biology, Finance)",
  "problem": "the real-world problem this concept addresses",
  "what": "clear definition of the concept",
  "why": "why this concept matters",
  "how": "how it works mechanically",
  "where": ["application area 1", "application area 2", "application area 3"],
  "who": "who uses or is affected by this",
  "when": "when this concept applies or became relevant",
  "pseudocode": "optional pseudocode for technical concepts, or empty string"
}

User input: "${input}"

Return ONLY valid JSON. No markdown, no explanation.`

  const text = await callGemini(
    prompt,
    MODELS.primary,
    jsonGenerationConfig(fiveWHResponseSchema),
  )
  return extractJSON(text)
}

async function generateImplementationPreview(data: Record<string, unknown>) {
  requireFields(data, ['concept'])

  const {
    concept,
    conversationHistory = [],
    userConcepts = [],
    learnerProfile = '',
    location,
    careerGoals,
    ideaTitles,
    projectTitle,
    difficulty,
  } = data
  logger.info('generateImplementationPreview', 'Generating preview', { conceptTitle: (concept as any)?.title })

  const c = concept as any
  const history = (conversationHistory as any[]).map((m: any) => `${m.role}: ${m.content}`).join('\n')
  const profileCtx = learnerProfile ? `\nLEARNER PROFILE:\n${learnerProfile}` : ''
  const locationCtx = location ? `\nStudent location: ${location}` : ''
  const goalsCtx = careerGoals ? `\nCareer goals: ${(careerGoals as string[]).join(', ')}` : ''

  const prompt = `You are an educational AI. Generate a real-world project implementation preview for a student.

Concept: ${c.title || ''}
Requested project title: ${projectTitle || 'Choose a suitable title'}
Target difficulty: ${difficulty || 'Choose an appropriate level'}
Category: ${c.category || ''}
What: ${c.what || ''}
Why it matters: ${c.why || ''}
How: ${c.how || ''}
Applications: ${Array.isArray(c.where) ? c.where.join(', ') : ''}
Other concepts the student has learned: ${(userConcepts as any[]).map((item: any) => item.title || item.originalInput || item).slice(0, 20).join(', ')}
${history ? `\nRecent conversation:\n${history}` : ''}${profileCtx}${locationCtx}${goalsCtx}

Return ONLY valid JSON with EXACTLY these fields:
{
  "projectName": "descriptive project name that sounds real (e.g. 'Smart HVAC Fault Detector')",
  "type": "one of: Simulation, Script, Application, Lab, Tool, Dashboard, Model",
  "tool": "specific tool/platform (e.g. Python, MATLAB, React, Arduino)",
  "language": "programming language",
  "components": ["component 1", "component 2", "component 3"],
  "learningGoals": ["goal 1", "goal 2", "goal 3"],
  "problemAddressed": "specific real-world problem this project solves",
  "whySuggested": "why this is relevant for this student's learning journey",
  "realWorldContext": "real organization or industry context",
  "industry": "primary industry sector",
  "flowDiagram": "graph TD\\n  A[Start] --> B[Process] --> C[End]"
}`

  const text = await callGemini(
    prompt,
    MODELS.primary,
    jsonGenerationConfig(implementationPreviewResponseSchema),
  )
  return extractJSON(text)
}

async function generateImplementationCode(data: Record<string, unknown>) {
  requireFields(data, ['concept', 'projectType', 'tool', 'language'])

  const { concept, projectType, tool, language, template } = data
  logger.info('generateImplementationCode', 'Generating full implementation', { tool, language, projectType })

  const prompt = `Generate a complete, working project implementation.

Concept: ${JSON.stringify(concept)}
Project Type: ${projectType}
Tool: ${tool}
Language: ${language}${template ? `\nBase template for structure reference: ${JSON.stringify(template)}` : ''}

Return ONLY valid JSON:
{
  "code": "complete working code",
  "pseudocode": "plain-English pseudocode walkthrough",
  "flowDiagram": "mermaid flowchart syntax",
  "instructions": "step-by-step setup and run instructions",
  "learningGoals": ["goal 1", "goal 2", "goal 3"],
  "expectedOutcomes": ["outcome 1", "outcome 2"]
}`

  const text = await callGemini(
    prompt,
    MODELS.primary,
    jsonGenerationConfig(implementationCodeResponseSchema),
  )
  return extractJSON(text)
}

async function generateInlinePrompt(data: Record<string, unknown>) {
  requireFields(data, ['concept'])

  const { concept, chatHistory = [] } = data

  const prompt = `You are a learning facilitator. Ask one short, conversational clarification question (under 90 characters) about something the learner said in their latest message.

Concept: ${(concept as any)?.title || (concept as any)?.originalInput || JSON.stringify(concept)}
Recent chat (assistant messages are questions already shown; focus on the latest learner message): ${JSON.stringify((chatHistory as any[]).slice(-12))}

Clarify what the learner meant or how they understand a point they already raised. Do not ask them for examples, applications, or problem-solving, and do not ask how they would use the concept. Avoid repeating or closely rephrasing any previous question.

If the latest learner message has nothing specific that needs clarification, return an empty string.

Return ONLY the question as a plain string. No quotes, no explanation.`

  const text = await callGemini(prompt)
  return text.trim().replace(/^["']|["']$/g, '')
}

async function generateTags(data: Record<string, unknown>) {
  requireFields(data, ['content'])

  const { content, existingTags = [] } = data

  const prompt = `Suggest 3-5 concise tags for this content.

Content: ${String(content).slice(0, 1000)}${(existingTags as string[]).length ? `\nExisting tags (avoid duplicates): ${(existingTags as string[]).join(', ')}` : ''}

Return ONLY a valid JSON array of strings. Example: ["machine learning", "Python", "classification"]`

  const text = await callGemini(prompt)
  return extractJSON<string[]>(text)
}

// ===== ROUTER =====
const handlers: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
  generate5WH,
  generateImplementationPreview,
  generateImplementationCode,
  generateInlinePrompt,
  generateTags,
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
