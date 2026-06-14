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

async function generateTrendContent(data: Record<string, unknown>) {
  requireFields(data, ['conceptTitles', 'category'])

  const { conceptTitles, category } = data
  logger.info('generateTrendContent', 'Generating trend article', { category })

  const prompt = `Write an informative trend article about recent developments in "${category}".
The student has learned these related concepts: ${(conceptTitles as string[]).join(', ')}.

Return ONLY valid JSON:
{
  "title": "engaging article title",
  "content": "2-3 paragraph article covering latest trends, breakthroughs, or real-world applications",
  "source": "plausible publication name (e.g. IEEE Spectrum, TechCrunch, Nature)",
  "sourceUrl": "https://example.com/relevant-url",
  "relevanceToUser": "one sentence on why this matters to the student given what they've learned",
  "relatedConcepts": ["related concept 1", "related concept 2"],
  "category": "${category}"
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function generateOpportunityProjects(data: Record<string, unknown>) {
  requireFields(data, ['concepts'])

  const { concepts, location, careerGoals, ideaTitles } = data
  const titles = (concepts as any[]).map((c: any) => c.title || c).slice(0, 10)
  logger.info('generateOpportunityProjects', 'Generating opportunity projects', { conceptCount: titles.length })

  const prompt = `Generate 2-3 practical project ideas based on these learned concepts.

Concepts learned: ${titles.join(', ')}${location ? `\nStudent location: ${location}` : ''}${careerGoals ? `\nCareer goals: ${(careerGoals as string[]).join(', ')}` : ''}${ideaTitles ? `\nProject ideas already shown (avoid repeating): ${(ideaTitles as string[]).join(', ')}` : ''}

Return ONLY a valid JSON array:
[{
  "projectName": "specific project name",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": "e.g. 6 hours",
  "prerequisites": ["skill 1", "skill 2"],
  "reasons": ["why this project is valuable", "what concept it reinforces"],
  "locationContext": "how this is relevant locally or regionally",
  "problemType": "everyday|academic|professional|social"
}]`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function analyzeKnowledgeGaps(data: Record<string, unknown>) {
  requireFields(data, ['concepts', 'completedProjects'])

  const { concepts, completedProjects } = data
  logger.info('analyzeKnowledgeGaps', 'Analyzing knowledge gaps', {
    conceptCount: (concepts as any[]).length,
    projectCount: (completedProjects as any[]).length,
  })

  const prompt = `Analyze this student's knowledge gaps based on what they've learned and built.

Concepts studied: ${(concepts as any[]).map((c: any) => c.title || c).join(', ')}
Projects completed: ${(completedProjects as any[]).map((p: any) => p.projectName || p).join(', ')}

Return ONLY valid JSON:
{
  "gaps": [{
    "area": "knowledge area with a gap",
    "description": "what specifically is missing",
    "suggestedConcept": "concept to learn next"
  }],
  "learningPattern": "brief description of how this student learns (e.g. practical-first, theory-heavy)",
  "opportunityProjects": [{
    "title": "project to fill a gap",
    "summary": "what it covers and why",
    "skills": ["skill 1", "skill 2"]
  }]
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function generateDynamicInsights(data: Record<string, unknown>) {
  requireFields(data, ['concepts'])

  const { concepts, feedback = [] } = data
  logger.info('generateDynamicInsights', 'Generating learning insights', { conceptCount: (concepts as any[]).length })

  const prompt = `Generate personalized learning insights for this student.

Concepts studied: ${JSON.stringify((concepts as any[]).map((c: any) => ({ title: c.title, category: c.category })))}
Feedback data: ${JSON.stringify((feedback as any[]).map((f: any) => ({ difficulty: f.difficultyRating, enjoyment: f.enjoymentRating })))}

Return ONLY valid JSON:
{
  "learnerProfile": "2-sentence description of this student's learning style and strengths",
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "suggestedNextTopics": ["topic 1", "topic 2", "topic 3"],
  "engagementScore": 0.75
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function suggestToolAlternatives(data: Record<string, unknown>) {
  requireFields(data, ['tool', 'projectType'])

  const { tool, projectType } = data
  logger.info('suggestToolAlternatives', 'Suggesting alternatives', { tool, projectType })

  const prompt = `Suggest 3 alternatives to ${tool} for ${projectType} projects.

Return ONLY a valid JSON array:
[{
  "tool": "tool name",
  "reason": "why it's a good alternative",
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1"],
  "bestFor": "what type of projects it's best suited for"
}]`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function filterOutMasteredPrerequisites(data: Record<string, unknown>) {
  requireFields(data, ['newPrerequisites', 'masteredSkills'])

  const { newPrerequisites, masteredSkills } = data
  logger.info('filterOutMasteredPrerequisites', 'Filtering mastered prerequisites', {
    newCount: (newPrerequisites as string[]).length,
    masteredCount: (masteredSkills as string[]).length,
  })

  const prompt = `A student has already mastered certain skills. Filter out any new prerequisites that are already covered by their mastered skills (including semantically equivalent ones).

New prerequisites to check: ${JSON.stringify(newPrerequisites)}
Skills already mastered: ${JSON.stringify(masteredSkills)}

Return ONLY valid JSON:
{
  "filtered": ["prerequisites NOT yet mastered — keep these"],
  "removed": ["prerequisites already covered by mastered skills"]
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function selectBestProjectTemplate(data: Record<string, unknown>) {
  requireFields(data, ['candidates', 'targetType', 'targetTool', 'targetLanguage'])

  const { candidates, targetType, targetTool, targetLanguage } = data
  logger.info('selectBestProjectTemplate', 'Selecting best template', { targetType, targetTool, targetLanguage })

  const prompt = `Select the best template project to use as a structural base for a new project.

New project needs: Type: ${targetType}, Tool: ${targetTool}, Language: ${targetLanguage}

Available templates:
${JSON.stringify((candidates as any[]).map((c: any) => ({ name: c.projectName, type: c.type, tool: c.tool, language: c.language })))}

Return ONLY valid JSON:
{
  "selectedProject": { "name": "...", "type": "...", "tool": "...", "language": "..." },
  "confidence": 0.85,
  "reasoning": "why this template is the best structural match"
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function convertImplementation(data: Record<string, unknown>) {
  requireFields(data, ['code', 'fromTool', 'fromLanguage', 'toTool', 'toLanguage'])

  const { code, fromTool, fromLanguage, toTool, toLanguage } = data
  logger.info('convertImplementation', 'Converting implementation', { fromTool, toTool, fromLanguage, toLanguage })

  const prompt = `Convert this implementation from ${fromTool} (${fromLanguage}) to ${toTool} (${toLanguage}).
Preserve the logic and structure while using idiomatic ${toLanguage} patterns.

Original code:
${String(code).slice(0, 4000)}

Return ONLY valid JSON:
{
  "convertedCode": "complete converted code",
  "pseudocode": "pseudocode for the converted version",
  "notes": ["notable differences or caveats about the conversion"]
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function validateCustomTool(data: Record<string, unknown>) {
  requireFields(data, ['tool', 'language', 'projectType'])

  const { tool, language, projectType } = data
  logger.info('validateCustomTool', 'Validating tool choice', { tool, language, projectType })

  const prompt = `Evaluate whether ${tool} is a good choice for ${projectType} projects using ${language}.

Return ONLY valid JSON:
{
  "valid": true,
  "confidence": 0.85,
  "reasoning": "explanation of why this is or isn't a good fit",
  "alternatives": ["alternative tool 1", "alternative tool 2"],
  "learningCurve": "beginner|intermediate|advanced",
  "communitySupport": "high|medium|low"
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function regenerateFlowDiagram(data: Record<string, unknown>) {
  requireFields(data, ['implementation'])

  const impl = data.implementation as any
  logger.info('regenerateFlowDiagram', 'Regenerating flow diagram', { project: impl?.projectName })

  const prompt = `Generate a clear Mermaid flowchart for this project implementation.

Project: ${impl.projectName || 'Unknown'}
Instructions summary: ${String(impl.instructions || '').slice(0, 1000)}
Code summary: ${String(impl.code || '').slice(0, 500)}

Return ONLY valid JSON:
{
  "flowDiagram": "flowchart TD\\n  A[Start] --> B[Step 1]\\n  B --> C[Step 2]\\n  ..."
}`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

async function scoreResources(data: Record<string, unknown>) {
  requireFields(data, ['resources', 'concept'])

  const { resources, concept } = data
  logger.info('scoreResources', 'Scoring resources for relevance', { resourceCount: (resources as any[]).length })

  const prompt = `Score these learning resources for their relevance to understanding "${concept}".

Resources:
${JSON.stringify((resources as any[]).map((r: any) => ({ title: r.title, type: r.type, source: r.source, snippet: r.snippet || r.description })))}

Return ONLY a valid JSON array (one entry per resource, same order):
[{
  "relevanceScore": 75,
  "relevanceReason": "one sentence on why this resource is relevant"
}]`

  const text = await callGemini(prompt)
  return extractJSON(text)
}

/**
 * Generate highly specific YouTube search queries for a concept using Gemini.
 * Returns queries that will surface the most targeted educational videos.
 */
async function generateResourceQueries(data: Record<string, unknown>) {
  requireFields(data, ['concept'])

  const { concept, category = '', context = '' } = data
  logger.info('generateResourceQueries', 'Generating specific resource queries', { concept })

  const prompt = `You are an expert educational researcher. Generate 6 highly specific YouTube/web search queries to find the BEST learning resources for this exact concept.

Concept: "${concept}"
${category ? `Category: ${category}` : ''}
${context ? `Context: ${context}` : ''}

Rules:
- Be SPECIFIC, not generic. Instead of "neural networks tutorial" use "backpropagation gradient descent step by step derivation visualized"
- Cover different learning angles: visual explanation, worked examples, theory/math, practical implementation, beginner intro, and advanced deep dive
- Include the exact technical term plus clarifying words that narrow the scope
- Think: what would a student type on YouTube to find the PERFECT video on exactly this topic?

Return ONLY a valid JSON array of 6 strings with no other text:
["specific query 1", "specific query 2", "specific query 3", "specific query 4", "specific query 5", "specific query 6"]`

  // Use Groq (faster, higher quota) for query generation
  const text = await callGemini(prompt)
  return extractJSON(text)
}

/**
 * Fetch real YouTube videos using YouTube Data API v3.
 * Uses the YOUTUBE_API_KEY from Supabase Secrets.
 */
async function fetchYouTubeVideos(data: Record<string, unknown>) {
  requireFields(data, ['queries'])

  const { queries, maxPerQuery = 3 } = data
  const youtubeKey = Deno.env.get('YOUTUBE_API_KEY') || ''

  if (!youtubeKey) {
    logger.warn('fetchYouTubeVideos', 'YOUTUBE_API_KEY not configured')
    return { videos: [], error: 'YouTube API key not configured' }
  }

  logger.info('fetchYouTubeVideos', 'Fetching YouTube videos', { queryCount: (queries as string[]).length })

  const allVideos: any[] = []
  const seen = new Set<string>()

  for (const query of (queries as string[]).slice(0, 6)) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('q', query)
      url.searchParams.set('type', 'video')
      url.searchParams.set('maxResults', String(maxPerQuery))
      url.searchParams.set('relevanceLanguage', 'en')
      url.searchParams.set('videoDuration', 'medium')
      url.searchParams.set('safeSearch', 'strict')
      url.searchParams.set('key', youtubeKey)

      const res = await fetch(url.toString())
      if (!res.ok) {
        const err = await res.text()
        logger.warn('fetchYouTubeVideos', `YouTube API error for query "${query}": ${res.status}`, { err: err.slice(0, 200) })
        continue
      }

      const ytData = await res.json() as any
      const items = ytData.items || []

      for (const item of items) {
        const videoId = item.id?.videoId
        if (!videoId || seen.has(videoId)) continue
        seen.add(videoId)

        const snippet = item.snippet || {}
        allVideos.push({
          title: snippet.title || 'YouTube Video',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          channelTitle: snippet.channelTitle || '',
          description: (snippet.description || '').slice(0, 200),
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          publishedAt: snippet.publishedAt || '',
          matchedQuery: query,
        })
      }
    } catch (err) {
      logger.warn('fetchYouTubeVideos', `Failed fetching for query "${query}"`, { error: String(err) })
    }
  }

  logger.info('fetchYouTubeVideos', `Fetched ${allVideos.length} unique videos`)
  return { videos: allVideos }
}

// ===== ROUTER =====
const handlers: Record<string, (data: Record<string, unknown>) => Promise<unknown>> = {
  generateTrendContent,
  generateOpportunityProjects,
  analyzeKnowledgeGaps,
  generateDynamicInsights,
  suggestToolAlternatives,
  filterOutMasteredPrerequisites,
  selectBestProjectTemplate,
  convertImplementation,
  validateCustomTool,
  regenerateFlowDiagram,
  scoreResources,
  generateResourceQueries,
  fetchYouTubeVideos,
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
