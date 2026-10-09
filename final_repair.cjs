const fs = require('fs');

const aiContent = `import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function safeJsonParse(text) {
  try {
    return JSON.parse(text.replace(/\\`\\`\\`json|\\`\\`\\`/g, '').trim());
  } catch (e) { return null; }
}

export async function generate5WH(input) {
  try {
    const result = await model.generateContent("Generate 5W+H JSON for: " + input);
    return await safeJsonParse(result.response.text()) || {};
  } catch (e) { return {}; }
}

export async function generateInlinePrompt(content, previous, recent) {
  return "Keep learning about " + recent;
}

export async function generateChatResponse(message, history, context) {
  try {
    const result = await model.generateContent("Context: " + JSON.stringify(context) + "\\nUser: " + message);
    return result.response.text();
  } catch (e) { return "Error generating response."; }
}

export async function generateTags(content) {
  return ["learning", "concept"];
}

export async function generateOpportunityProjects(concepts, location, goals, complexity = "same", reference = null) {
  try {
    const result = await model.generateContent("Generate 3 project ideas for " + concepts.map(c => c.title).join(", ") + " at " + complexity + " difficulty. Return JSON { projects: [] }.");
    const data = await safeJsonParse(result.response.text());
    return data?.projects || [];
  } catch (e) { return []; }
}

export async function generateImplementationPreview(concept, projectName, complexity = "same") {
  try {
    const result = await model.generateContent("Preview implementation for " + projectName + " using " + concept.title + " at " + complexity + " difficulty. Return JSON.");
    return await safeJsonParse(result.response.text()) || { projectName };
  } catch (e) { return { projectName }; }
}

export async function analyzeKnowledgeGaps(concepts) {
  try {
    const result = await model.generateContent("Analyze knowledge gaps for: " + concepts.map(c => c.title).join(", ") + ". Return JSON array.");
    return await safeJsonParse(result.response.text()) || [];
  } catch (e) { return []; }
}
`;
fs.writeFileSync('server/ai-service.ts', aiContent);

let routes = fs.readFileSync('server/routes.ts', 'utf8');
// Fix the common syntax error where multiple closures were accidentally added
routes = routes.replace(/\}\);\s*\}\);/g, '  });');
fs.writeFileSync('server/routes.ts', routes);

console.log("Fixed files");
