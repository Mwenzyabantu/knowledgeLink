const fs = require('fs');
const path = 'server/ai-service.ts';
let content = fs.readFileSync(path, 'utf8');

const newFunctions = `export async function generateOpportunityProjects(
  concepts: any[],
  userLocation?: string,
  userGoals?: string[],
  complexity: string = "same",
  referenceProject: any = null
): Promise<any[]> {
  if (concepts.length === 0) {
    return [];
  }

  let complexityPrompt = "";
  if (complexity === "easier") {
    complexityPrompt = "The generated projects should be EASIER and more foundational than the reference project provided.";
  } else if (complexity === "advanced") {
    complexityPrompt = "The generated projects should be MORE ADVANCED and complex than the reference project provided, pushing the learner's boundaries.";
  } else {
    complexityPrompt = "The generated projects should be at a SIMILAR complexity level to the reference project provided.";
  }

  const referenceText = referenceProject ? 
    \`Most recent project reference:
    Name: \${referenceProject.projectName || referenceProject.title}
    Difficulty: \${referenceProject.difficulty}
    Summary: \${referenceProject.problemAddressed || referenceProject.summary}\` : 
    "No recent project reference available.";

  const systemPrompt = \`You are a "Community Solutions Architect". Your goal is to create 3 SIMPLE, meaningful project opportunities that solve everyday real-world problems by applying recent learning.

DIFFICULTY LEVEL REQUESTED: \${complexity}
\${complexityPrompt}
\${referenceText}

Rules:
1. MEANINGFUL & SIMPLE: Avoid technical jargon. Focus on practical utility for everyday life.
2. EVERYDAY PROBLEMS: Solve issues someone might face at home, in their neighborhood, or at a local small business.
3. SPECIALIZATION: If a user location is provided (\${userLocation || "not provided"}), anchor projects in that local context.
4. PERSONALIZATION: Incorporate the user's career goals (\${userGoals?.join(", ") || "none provided"}) and themes from their learned concepts.
5. ACTIONABLE: The user should feel they can provide a "best solution" simply by applying what they've learnt.

Return valid JSON in this exact format:
{
  "projects": [
    {
      "projectName": "Catchy, simple name",
      "difficulty": "beginner/intermediate/advanced",
      "estimatedTime": "X hours",
      "problemType": "everyday",
      "locationContext": "Home/Office/Community",
      "reasons": ["Why this is a good project", "How it helps practice"],
      "prerequisites": ["Required concept 1", "Required skill 2"],
      "problemAddressed": "Detailed description of the real-world problem"
    }
  ]
}\`;

  const learningHistory = concepts
    .map((c, i) => \`\${i + 1}. \${c.title}: \${c.what.substring(0, 100)}\`)
    .join("\\n");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: \`Learning History:\\n\${learningHistory}\\nLocation: \${userLocation || "General"}\\nGoals: \${userGoals?.join(", ") || "General application"}\`,
    });

    const result = JSON.parse(response.text || "{}");
    return result.projects || [];
  } catch (error) {
    console.error("Opportunity generation failed:", error);
    try {
      const groqResponse = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: \`Concepts: \${concepts.map(c => c.title).join(", ")}\` }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(groqResponse.choices[0]?.message?.content || "{}");
      return result.projects || [];
    } catch (e) {
      return [];
    }
  }
}

export async function generateImplementationPreview(
  concept: any,
  projectName: string,
  complexity: string = "same"
): Promise<any> {
  const systemPrompt = \`You are an expert developer. Create a project implementation preview for "\${projectName}" based on the concept "\${concept.title}".
DIFFICULTY LEVEL: \${complexity}

Return valid JSON:
{
  "projectName": "\${projectName}",
  "type": "Web App/Script/Automation",
  "tool": "Tool/Language",
  "language": "Language",
  "components": ["List of parts"],
  "learningGoals": ["What will be learned"],
  "problemAddressed": "Real problem description",
  "whySuggested": "Reasoning",
  "realWorldContext": "Usage scenario",
  "industry": "Industry"
}\`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: \`Concept: \${concept.title}\\nWhat: \${concept.what}\\nWhy: \${concept.why}\\nHow: \${concept.how}\`,
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Preview generation failed:", error);
    return { projectName, type: "Project", tool: "Generic", language: "Generic", components: [], learningGoals: [] };
  }
}
`;

const startIndex = content.indexOf('export async function generateOpportunityProjects');
if (startIndex !== -1) {
    const finalContent = content.substring(0, startIndex) + newFunctions;
    fs.writeFileSync(path, finalContent);
    console.log('Successfully fixed ai-service.ts');
} else {
    console.error('Could not find start of function');
    process.exit(1);
}
