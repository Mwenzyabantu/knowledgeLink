import {
  generate5WH,
  generateInlinePrompt,
  generateChatResponse,
  generateTags,
  generateOpportunityProjects,
  generateImplementationPreview,
  analyzeKnowledgeGaps,
  convertImplementation,
  generateImplementationCode,
  selectBestProjectTemplate,
  filterOutMasteredPrerequisites,
  generateTrendContent,
  suggestToolAlternatives,
  validateCustomTool,
  generateDynamicInsights,
} from "./ai-service";
import {
  insertChatMessageSchema,
  insertChatSessionSchema,
  insertConceptSchema,
  insertImplementationSchema,
  insertProjectFeedbackSchema,
  insertUserPersonalizationSchema,
  insertUserSettingsSchema,
  type UserPersonalization,
} from "@shared/schema";
import { safeHttpUrl } from "@shared/safe-url";
import { createServer, type Server } from "http";
import type { Express } from "express";
import { storage } from "./supabase-storage";
import {
  fetchResourcesForPrerequisite,
  fetchResourcesForPrerequisites,
} from "./resource-fetcher";
import { cleanupSSEClient, registerSSEClient } from "./sse-generator";


function personalizationProjectContext(personalization?: UserPersonalization) {
  return [
    ...(personalization?.careerGoals ?? []),
    personalization?.currentCareer
      ? `Current career: ${personalization.currentCareer}`
      : undefined,
    personalization?.aspiringCareer
      ? `Aspiring career: ${personalization.aspiringCareer}`
      : undefined,
    personalization?.desiredRole
      ? `Desired role: ${personalization.desiredRole}`
      : undefined,
    personalization?.targetIndustry
      ? `Target industry: ${personalization.targetIndustry}`
      : undefined,
    personalization?.skillsFocus?.length
      ? `Skills to focus on: ${personalization.skillsFocus.join(", ")}`
      : undefined,
    personalization?.yearsOfExperience != null
      ? `Years of experience: ${personalization.yearsOfExperience}`
      : undefined,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function personalizationTrendContext(
  personalization?: UserPersonalization,
): Record<string, unknown> | undefined {
  if (!personalization) return undefined;
  return {
    careerGoals: personalization.careerGoals ?? [],
    currentCareer: personalization.currentCareer,
    aspiringCareer: personalization.aspiringCareer,
    desiredRole: personalization.desiredRole,
    targetIndustry: personalization.targetIndustry,
    yearsOfExperience: personalization.yearsOfExperience,
    skillsFocus: personalization.skillsFocus ?? [],
    location: personalization.location,
    projectPreferences: personalization.projectPreferences ?? {},
  };
}

function personalizationLearnerSummary(
  personalization?: UserPersonalization,
): string {
  return personalizationProjectContext(personalization).join("\n");
}

async function getOrCreateUserPersonalization(
  userId: string,
): Promise<UserPersonalization> {
  const existing = await storage.getUserPersonalization(userId);
  if (existing) return existing;

  return storage.createUserPersonalization({
    userId,
    careerGoals: [],
    currentCareer: null,
    aspiringCareer: null,
    desiredRole: null,
    targetIndustry: null,
    yearsOfExperience: null,
    skillsFocus: [],
    preferredVoice: "",
    theme: "system",
    location: null,
    locationLastUpdated: null,
    projectPreferences: {},
  });
}


// Helper function to generate and save projects
async function generateAndSaveProjects(userId: string) {
  const concepts = await storage.getConcepts(userId);
  if (concepts.length === 0) {
    throw new Error("No concepts found to generate projects");
  }
  
  const personalization = await storage.getUserPersonalization(userId);
  const generatedProjects = await generateOpportunityProjects(
    concepts, 
    personalization?.location || undefined,
    personalizationProjectContext(personalization)
  );
  
  const savedProjects = await Promise.all(
    generatedProjects.map(proj => {
      const conceptIds = concepts.slice(0, 2).map(c => c.id);
      const estimatedHours = parseInt(proj.estimatedTime?.match(/\d+/)?.[0] || "8");
      
      return storage.createOpportunityProject({
        userId,
        title: proj.projectName,
        summary: proj.reasons?.join(" ") || "No summary provided",
        difficulty: (proj.difficulty || "intermediate").toLowerCase(),
        estimatedHours,
        skills: proj.prerequisites || [],
        relatedConceptIds: conceptIds,
        recommendedImplementationId: null,
        locationContext: proj.locationContext || null,
        problemType: proj.problemType || "everyday",
      });
    })
  );
  
  return savedProjects;
}

// Helper function to check and run daily generation
async function checkDailyGeneration(userId: string) {
  try {
    const settings = await storage.getUserSettings(userId);
    if (!settings || !settings.enableDailyGeneration) {
      return;
    }

    let tracking = await storage.getGenerationTracking(userId);
    
    // Initialize tracking if it doesn't exist
    if (!tracking) {
      tracking = await storage.createGenerationTracking({
        userId,
        lastDailyGeneration: new Date(),
        conceptCountSinceLastGeneration: 0,
      });
      return;
    }
    
    const now = new Date();
    if (tracking.lastDailyGeneration) {
      const lastGen = new Date(tracking.lastDailyGeneration);
      const daysSinceLastGen = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
      const frequencyDays = settings.dailyGenerationFrequencyDays || 1;
      
      // Generate based on frequency setting
      if (daysSinceLastGen >= frequencyDays) {
        const concepts = await storage.getConcepts(userId);
        if (concepts.length > 0) {
          console.log(`Running automatic project generation (frequency: ${frequencyDays} days)`);
          await generateAndSaveProjects(userId);
          await storage.updateGenerationTracking(tracking.id, {
            lastDailyGeneration: now,
          });
        }
      }
    }
  } catch (error) {
    console.error("Daily generation check error:", error);
  }
}

// Helper function to check and generate after 3 concepts
async function checkConceptCountGeneration(userId: string) {
  try {
    const settings = await storage.getUserSettings(userId);
    if (!settings || !settings.enableConceptCountGeneration) {
      return;
    }

    let tracking = await storage.getGenerationTracking(userId);
    
    // Initialize tracking if it doesn't exist
    if (!tracking) {
      tracking = await storage.createGenerationTracking({
        userId,
        lastDailyGeneration: new Date(),
        conceptCountSinceLastGeneration: 0,
      });
    }
    
    // Increment concept count
    const newCount = (tracking.conceptCountSinceLastGeneration || 0) + 1;
    
    // Update the counter first
    await storage.updateGenerationTracking(tracking.id, {
      conceptCountSinceLastGeneration: newCount,
    });
    
    // Check if we should generate (based on user's threshold)
    const threshold = settings.conceptCountThreshold || 3;
    if (newCount >= threshold) {
      const concepts = await storage.getConcepts(userId);
      if (concepts.length >= threshold) {
        console.log(`Running automatic project generation after ${threshold} concepts`);
        await generateAndSaveProjects(userId);
        // Reset counter after successful generation
        await storage.updateGenerationTracking(tracking.id, {
          conceptCountSinceLastGeneration: 0,
        });
      }
    }
  } catch (error) {
    console.error("Concept count generation check error:", error);
  }
}

// Helper function to generate and save trends
async function generateAndSaveTrends(userId: string) {
  const concepts = await storage.getConcepts(userId);
  if (concepts.length === 0) {
    throw new Error("No concepts found to generate trends");
  }
  
  const personalization = await storage.getUserPersonalization(userId);
  const generatedTrends = await generateTrendContent(
    concepts,
    personalizationTrendContext(personalization),
  );
  
  const savedTrends = await Promise.all(
    generatedTrends.map(trend => {
      return storage.createTrend({
        userId,
        title: trend.title,
        content: trend.content,
        imageUrl: trend.imageUrl || null,
        source: "ai_generated",
        relevanceToUser: trend.relevanceToUser,
        relatedConcepts: trend.relatedConcepts,
        category: trend.category,
        sourceUrl: safeHttpUrl(trend.sourceUrl),
        readByUser: false,
        userRating: null,
      });
    })
  );
  
  return savedTrends;
}

// Helper function to check and generate trends after every 2 concepts
async function checkTrendGeneration(userId: string) {
  try {
    const concepts = await storage.getConcepts(userId);
    // Generate trends every 2 concepts
    if (concepts.length > 0 && concepts.length % 2 === 0) {
      console.log(`Running automatic trend generation after ${concepts.length} concepts`);
      await generateAndSaveTrends(userId);
    }
  } catch (error) {
    console.error("Trend generation check error:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Pass userId to daily check if possible, though it's hard without a request context
  // This would ideally be a cron job or similar, but for now we'll skip the auto-check 
  // until a user actually makes a request that can provide context.
  
  app.get("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const p = await getOrCreateUserPersonalization(req.user!.id);
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });

  app.patch("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { theme } = req.body ?? {};
      if (typeof theme !== "string" || !["light", "dark", "system"].includes(theme)) {
        return res.status(400).json({ message: "Theme must be light, dark, or system" });
      }

      const personalization = await getOrCreateUserPersonalization(req.user!.id);
      const updated = await storage.updateUserPersonalization(
        personalization.id,
        { theme },
      );
      if (!updated) return res.status(404).json({ message: "Personalization not found" });
      res.json(updated);
    } catch (error) {
      console.error("Failed to update theme preference:", error);
      res.status(500).json({ message: "Failed to update theme preference" });
    }
  });

  app.post("/api/implementations/:id/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const implementation = await storage.getImplementationById(id);
      if (!implementation || implementation.userId !== userId) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const concept = await storage.getConceptById(implementation.conceptId);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }

      const generationId = Math.random().toString(36).substring(7);

      const generatedData = await generateImplementationCode(
        concept,
        implementation,
        [],
        generationId
      );

      await storage.updateImplementation(id, {
        code: generatedData.code,
        instructions: generatedData.instructions,
        pseudocode: generatedData.pseudocode,
        flowDiagram: generatedData.flowDiagram,
        status: "completed"
      });

      res.json({ generationId, message: "Generation complete", data: generatedData });
    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ message: "Failed to generate implementation" });
    }
  });

  app.get("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const p = await getOrCreateUserPersonalization(req.user!.id);
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });

  app.patch("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertUserPersonalizationSchema
        .omit({ userId: true })
        .partial()
        .safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid personalization data" });
      }

      const personalization = await getOrCreateUserPersonalization(req.user!.id);
      const updated = await storage.updateUserPersonalization(
        personalization.id,
        parsed.data,
      );
      if (!updated) return res.status(404).json({ message: "Personalization not found" });
      res.json(updated);
    } catch (error) {
      console.error("Failed to update personalization:", error);
      res.status(500).json({ message: "Failed to update personalization" });
    }
  });

  // User Settings endpoints
  app.get("/api/user-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      let settings = await storage.getUserSettings(userId);
      
      // Initialize settings if they don't exist
      if (!settings) {
        settings = await storage.createUserSettings({
          userId: userId,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.patch("/api/user-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const validated = insertUserSettingsSchema.partial().parse(req.body);
      
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        settings = await storage.createUserSettings({
          userId: userId,
          enableConceptCountGeneration: true,
          enableDailyGeneration: true,
          conceptCountThreshold: 3,
          dailyGenerationFrequencyDays: 1,
        });
      }
      
      const updated = await storage.updateUserSettings(settings.id, validated);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update user settings:", error);
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  app.patch("/api/user/avatar", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { avatarData } = req.body;
      const updatedUser = await storage.updateUser(req.user!.id, { avatarUrl: avatarData });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  app.post("/api/opportunity-projects/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { complexity, referenceProjectId } = req.body;
      
      const concepts = await storage.getConcepts(userId);
      if (concepts.length === 0) {
        return res.status(400).json({ message: "No concepts found to generate projects" });
      }

      const personalization = await storage.getUserPersonalization(userId);
      let referenceProject = null;
      if (referenceProjectId) {
        referenceProject = await storage.getOpportunityProjectById(referenceProjectId, userId);
      }

      const generatedProjects = await generateOpportunityProjects(
        concepts,
        personalization?.location || undefined,
        personalization?.careerGoals || undefined,
        complexity || "same",
        referenceProject
      );

      const savedProjects = await Promise.all(
        generatedProjects.map(proj => {
          const conceptIds = concepts.slice(0, 2).map(c => c.id);
          const estimatedHours = parseInt(proj.estimatedTime?.match(/\d+/)?.[0] || "8");

          return storage.createOpportunityProject({
            userId,
            title: proj.projectName,
            summary: proj.problemAddressed || proj.summary || "No summary provided",
            difficulty: (proj.difficulty || "intermediate").toLowerCase(),
            estimatedHours,
            skills: proj.prerequisites || [],
            relatedConceptIds: conceptIds,
            recommendedImplementationId: null,
            locationContext: proj.locationContext || null,
            problemType: proj.problemType || "everyday",
          });
        })
      );

      res.status(201).json(savedProjects);
    } catch (error) {
      console.error("Project generation error:", error);
      res.status(500).json({ message: "Failed to generate projects" });
    }
  });

  app.get("/api/opportunity-projects/:id/implementation-preview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const conceptId = project.relatedConceptIds?.[0];
      if (!conceptId) return res.status(400).json({ message: "No related concept found" });

      const concept = await storage.getConceptById(conceptId);
      if (!concept) return res.status(404).json({ message: "Concept not found" });

      // Check if implementation already exists
      const existing = await storage.getImplementationsByConceptId(conceptId);
      if (existing.length > 0) return res.json(existing[0]);

      // Generate preview
      const preview = await generateImplementationPreview(concept, project.title, project.difficulty);
      const implementation = await storage.createImplementation({
        ...preview,
        userId,
        conceptId,
        status: "preview",
        version: 1,
      });

      res.json(implementation);
    } catch (error) {
      console.error("Preview generation error:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });
  app.delete("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      await storage.deleteUser(userId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  app.get("/api/concepts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const concepts = await storage.getConcepts(userId);
      res.json(concepts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch concepts" });
    }
  });

  app.get("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const concept = await storage.getConceptById(id);
      if (!concept || concept.userId !== userId) {
        return res.status(404).json({ message: "Concept not found" });
      }
      
      // Fetch latest implementation for this concept
      const implementations = await storage.getImplementationsByConceptId(id);
      const latestImplementation = implementations.length > 0 ? implementations[0] : null;
      
      res.json({ ...concept, latestImplementation });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch concept" });
    }
  });

  app.patch("/api/concepts/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const concept = await storage.getConceptById(id);
      if (!concept || concept.userId !== userId) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const updated = await storage.updateConcept(id, { lastAccessedAt: new Date() });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.patch("/api/implementations/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const updated = await storage.updateImplementation(id, { lastAccessedAt: new Date() });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.patch("/api/opportunity-projects/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Opportunity project not found" });
      }
      const updated = await storage.updateOpportunityProject(id, { lastAccessedAt: new Date() });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.post("/api/concepts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const validated = insertConceptSchema.parse({
        ...req.body,
        userId: userId
      });
      const concept = await storage.createConcept(validated);
      
      // Fetch latest implementation to return complete object
      const implementations = await storage.getImplementationsByConceptId(concept.id);
      const latestImplementation = implementations.length > 0 ? implementations[0] : null;
      
      // Check if we should auto-generate opportunity projects (3 concepts trigger)
      checkConceptCountGeneration(userId).catch(err => console.log("Generation background task error (likely quota):", err.message));
      
      // Check if we should auto-generate trends (every 2 concepts trigger)
      checkTrendGeneration(userId).catch(err => console.log("Trend generation background task error (likely quota):", err.message));
      
      res.status(201).json({ ...concept, latestImplementation });
    } catch (error) {
      console.error("Concept creation error:", error);
      res.status(400).json({ message: "Invalid concept data" });
    }
  });

  app.patch("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const existing = await storage.getConceptById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const updates = req.body;
      const concept = await storage.updateConcept(id, updates);
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Failed to update concept" });
    }
  });

  app.delete("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const existing = await storage.getConceptById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const success = await storage.deleteConceptsWithProjects([id]);
      if (success === 0) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete concept error:", error);
      res.status(500).json({ message: "Failed to delete concept" });
    }
  });

  // Chat Sessions endpoints
  app.get("/api/chat-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const id = parseInt(req.params.id);
      const session = await storage.getChatSessionById(id, userId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.get("/api/concepts/:conceptId/chat-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const conceptId = parseInt(req.params.conceptId);
      const concept = await storage.getConceptById(conceptId);
      if (!concept || concept.userId !== userId) {
        return res.status(404).json({ message: "Concept not found" });
      }
      const session = await storage.getChatSessionByConceptId(conceptId);
      res.json(session || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.get("/api/implementations/:implementationId/chat-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const implementationId = parseInt(req.params.implementationId);
      const implementation = await storage.getImplementation(implementationId);
      if (!implementation || implementation.userId !== userId) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      const session = await storage.getChatSessionByProjectId(implementationId);
      res.json(session || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.post("/api/chat-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const validated = insertChatSessionSchema.parse({
        ...req.body,
        userId: userId
      });
      const session = await storage.createChatSession(validated);
      res.status(201).json(session);
    } catch (error) {
      console.error("Chat session creation error:", error);
      res.status(400).json({ message: "Invalid chat session data" });
    }
  });

  app.patch("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateChatSession(id, updates);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  app.delete("/api/chat-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChatSession(id);
      if (!success) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat session" });
    }
  });

  // Chat Messages endpoints
  app.get("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getChatMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat-sessions/:sessionId/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const sessionId = parseInt(req.params.sessionId);
      const validated = insertChatMessageSchema.parse({
        ...req.body,
        sessionId,
        userId: userId
      });
      const message = await storage.createChatMessage(validated);
      res.status(201).json(message);
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // AI endpoints
  app.post("/api/ai/generate-5wh", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { userInput } = req.body;
      if (!userInput) {
        return res.status(400).json({ message: "userInput is required" });
      }
      const result = await generate5WH(userInput);
      res.json(result);
    } catch (error) {
      console.error("5W+H generation error:", error);
      res.status(500).json({ message: "Failed to generate 5W+H" });
    }
  });

  app.post("/api/ai/inline-prompt", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { userInput, previousPrompts = [], recentTyping } = req.body;
      if (!userInput) {
        return res.status(400).json({ message: "userInput is required" });
      }
      // If recentTyping not provided, extract last sentence as fallback
      const recent = recentTyping || userInput.split(/[.!?]\s+/).pop() || userInput;
      const prompt = await generateInlinePrompt(userInput, previousPrompts, recent);
      res.json({ prompt });
    } catch (error) {
      console.error("Inline prompt generation error:", error);
      res.status(500).json({ message: "Failed to generate inline prompt" });
    }
  });

  app.post("/api/ai/chat-response", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { userMessage, conversationHistory = [], conceptContext } = req.body;
      if (!userMessage) {
        return res.status(400).json({ message: "userMessage is required" });
      }
      const response = await generateChatResponse(
        userMessage,
        conversationHistory,
        conceptContext
      );
      res.json({ response });
    } catch (error) {
      console.error("Chat response generation error:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  app.post("/api/ai/generate-tags", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { conversationContent } = req.body;
      if (!conversationContent) {
        return res.status(400).json({ message: "conversationContent is required" });
      }
      const tags = await generateTags(conversationContent);
      res.json({ tags });
    } catch (error) {
      console.error("Tag generation error:", error);
      res.status(500).json({ message: "Failed to generate tags" });
    }
  });

  app.post("/api/opportunity-projects/:id/implementation-preview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id, 10);
      const { complexity = "same" } = req.body;
      
      // Get the project from storage
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Find the concept it belongs to
      const concepts = await storage.getConcepts(userId);
      const concept = concepts.find((item) =>
        project.relatedConceptIds?.includes(item.id),
      ) || concepts.find((item) =>
        project.summary.toLowerCase().includes(item.title.toLowerCase()),
      ) || concepts[0];

      if (!concept) {
        return res.status(400).json({ message: "No learning concept found for this project" });
      }

      const preview = await generateImplementationPreview(
        concept,
        project.title,
        complexity
      );
      
      // Create implementation from preview
      const implementation = await storage.createImplementation({
        userId,
        conceptId: concept.id,
        projectName: preview.projectName,
        type: preview.type,
        tool: preview.tool,
        language: preview.language,
        components: preview.components,
        learningGoals: preview.learningGoals,
        problemAddressed: preview.problemAddressed,
        whySuggested: preview.whySuggested,
        realWorldContext: preview.realWorldContext,
        industry: preview.industry,
        instructions: "", 
        code: "",
        pseudocode: "",
        flowDiagram: preview.flowDiagram || "",
        status: "preview",
      });
      
      res.status(201).json(implementation);
    } catch (error) {
      console.error("Opportunity implementation preview error:", error);
      res.status(500).json({ message: "Failed to generate project preview" });
    }
  });

  app.get("/api/implementations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const implementations = await storage.getImplementations(userId);
      res.json(implementations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch implementations" });
    }
  });

  app.post("/api/implementations/preview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { conceptId, conversationHistory = [] } = req.body;
      
      if (!conceptId) {
        return res.status(400).json({ message: "conceptId is required" });
      }

      // Check for existing preview to save AI costs
      const existing = await storage.getImplementationsByConceptId(conceptId);
      const previewOnly = existing.find(i => !i.instructions || i.instructions.trim().length === 0);
      if (previewOnly && previewOnly.userId === userId) {
        return res.json(previewOnly);
      }
      
      const concept = await storage.getConceptById(conceptId);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      
      const userConcepts = await storage.getConcepts(userId);
      const preview = await generateImplementationPreview(
        concept,
        conversationHistory,
        userConcepts
      );
      
      const implementation = await storage.createImplementation({
        userId,
        conceptId,
        projectName: preview.projectName,
        type: preview.type,
        tool: preview.tool,
        language: preview.language,
        components: preview.components,
        learningGoals: preview.learningGoals,
        problemAddressed: preview.problemAddressed,
        whySuggested: preview.whySuggested,
        realWorldContext: preview.realWorldContext,
        industry: preview.industry,
        instructions: "", 
        code: "",
        pseudocode: "",
        flowDiagram: preview.flowDiagram || "",
        status: "preview",
      });
      
      res.status(201).json(implementation);
    } catch (error) {
      console.error("Implementation preview generation error:", error);
      res.status(500).json({ message: "Failed to generate implementation preview" });
    }
  });

  app.get("/api/implementations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch implementation" });
    }
  });

  app.get("/api/implementations/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const versions = await storage.getProjectVersions(id);
      res.json(versions.filter((version) => version.userId === userId));
    } catch (error) {
      console.error("Implementation version lookup error:", error);
      res.status(500).json({ message: "Failed to fetch implementation versions" });
    }
  });

  app.get("/api/implementations/:id/suggestions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const excludedTools = String(req.query.excluded ?? "")
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean);
      const suggestions = await suggestToolAlternatives(
        implementation.projectName,
        implementation.problemAddressed || "",
        implementation.industry || "",
        implementation.language || implementation.tool,
        excludedTools,
      );
      const excluded = new Set(excludedTools.map((tool) => tool.toLowerCase()));
      const currentLanguage = (implementation.language || implementation.tool).toLowerCase();
      const uniqueSuggestions = Array.from(new Set(
        suggestions
          .map((tool) => tool.trim())
          .filter((tool) => tool && tool.toLowerCase() !== currentLanguage && !excluded.has(tool.toLowerCase())),
      ));

      res.json(uniqueSuggestions);
    } catch (error) {
      console.error("Implementation alternative suggestions error:", error);
      res.status(500).json({ message: "Failed to find alternative tools" });
    }
  });

  app.post("/api/implementations/:id/validate-tool", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const tool = typeof req.body?.tool === "string" ? req.body.tool.trim() : "";
      if (!tool) {
        return res.status(400).json({ message: "A tool or language is required" });
      }

      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const validation = await validateCustomTool(
        implementation.projectName,
        implementation.problemAddressed || "",
        tool,
      );
      res.json(validation);
    } catch (error) {
      console.error("Custom conversion tool validation error:", error);
      res.status(500).json({ message: "Failed to validate the selected tool" });
    }
  });

  app.post("/api/implementations/:id/convert", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const targetLanguage =
        typeof req.body?.targetLanguage === "string" ? req.body.targetLanguage.trim() : "";
      if (!targetLanguage) {
        return res.status(400).json({ message: "A target language or tool is required" });
      }

      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      if (targetLanguage.toLowerCase() === implementation.language.toLowerCase()) {
        return res.status(400).json({ message: "Choose a different target language" });
      }

      const converted = await convertImplementation(
        implementation as unknown as Record<string, any>,
        targetLanguage,
      );
      const convertedCode = typeof converted.code === "string" ? converted.code : "";
      if (!convertedCode.trim()) {
        console.error("Implementation conversion returned empty code", { id, targetLanguage });
        return res.status(502).json({ message: "The conversion did not produce code" });
      }

      const newVersion = await storage.createImplementation({
        userId,
        conceptId: implementation.conceptId,
        chatHistoryId: implementation.chatHistoryId,
        projectName: implementation.projectName,
        type: implementation.type,
        tool: targetLanguage,
        language: targetLanguage,
        imageUrl: implementation.imageUrl,
        components: implementation.components || [],
        learningGoals: implementation.learningGoals || [],
        expectedOutcomes: implementation.expectedOutcomes || [],
        requiredArtifacts: implementation.requiredArtifacts || [],
        problemAddressed: implementation.problemAddressed,
        whySuggested: implementation.whySuggested,
        realWorldContext: implementation.realWorldContext,
        industry: implementation.industry,
        code: convertedCode,
        pseudocode: typeof converted.pseudocode === "string" ? converted.pseudocode : "",
        flowDiagram: implementation.flowDiagram,
        instructions: typeof converted.instructions === "string" ? converted.instructions : "",
        status: "in progress",
        version: (implementation.version || 1) + 1,
        previousVersionId: implementation.id,
      });

      res.status(201).json(newVersion);
    } catch (error) {
      console.error("Implementation conversion error:", error);
      res.status(500).json({ message: "Failed to convert implementation" });
    }
  });

  app.get("/api/implementations/similar", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { type, tool, language, limit } = req.query;
      if (!type || !tool || !language) {
        return res.status(400).json({ message: "Missing required query parameters" });
      }
      const implementations = await storage.getSimilarImplementations(
        String(type),
        String(tool),
        String(language),
        limit ? parseInt(String(limit)) : 5
      );
      res.json(implementations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch similar implementations" });
    }
  });

  app.post("/api/implementations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const validated = insertImplementationSchema.parse({
        ...req.body,
        userId: userId
      });
      const implementation = await storage.createImplementation(validated);
      res.status(201).json(implementation);
    } catch (error) {
      console.error("Implementation creation error:", error);
      res.status(400).json({ message: "Invalid implementation data" });
    }
  });

  app.patch("/api/implementations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const implementation = await storage.updateImplementation(id, updates);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update implementation" });
    }
  });

  app.delete("/api/implementations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteImplementation(id);
      if (!success) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete implementation" });
    }
  });

  // Project Feedback endpoints
  app.post("/api/project-feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      // Calculate which prerequisites were actually mastered based on met objectives
      // This is a simplification - in a real app, you'd map objectives to skills
      const metObjectives = (Array.isArray(req.body.metObjectives)
        ? req.body.metObjectives
        : []) as string[];
      const implementationId = Number(req.body.implementationId);
      
      // Save prerequisites as mastered
      if (metObjectives.length > 0) {
        await Promise.all(metObjectives.map(obj => 
          storage.createUserMasteredPrerequisite({
            userId,
            implementationId,
            prerequisite: obj
          })
        ));
      }

      const validated = insertProjectFeedbackSchema.parse({
        ...req.body,
        userId: userId
      });
      const feedback = await storage.createProjectFeedback(validated);
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Feedback creation error:", error);
      res.status(400).json({ message: "Invalid feedback data" });
    }
  });

  app.get("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const mastered = await storage.getUserMasteredPrerequisites(userId);
      res.json(mastered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mastered prerequisites" });
    }
  });

  // Trends endpoints
  app.get("/api/trends", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const trends = await storage.getTrends(userId);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  app.post("/api/trends/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      if (concepts.length === 0) {
        return res.status(400).json({ message: "Add a concept before generating trends." });
      }

      const trends = await generateAndSaveTrends(userId);
      if (trends.length === 0) {
        return res.status(502).json({ message: "The AI service did not return any trends." });
      }
      res.status(201).json(trends);
    } catch (error) {
      console.error("Trend generation error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate trends",
      });
    }
  });

  app.get("/api/trends/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: "Invalid trend id" });
      }

      const trend = await storage.getTrendById(id, req.user!.id);
      if (!trend) return res.status(404).json({ message: "Trend not found" });
      res.json(trend);
    } catch (error) {
      console.error("Failed to fetch trend:", error);
      res.status(500).json({ message: "Failed to fetch trend" });
    }
  });

  app.patch("/api/trends/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: "Invalid trend id" });
      }
      const { readByUser } = req.body ?? {};
      if (typeof readByUser !== "boolean") {
        return res.status(400).json({ message: "readByUser must be a boolean" });
      }

      const trend = await storage.updateTrend(
        id,
        { readByUser },
        req.user!.id,
      );
      if (!trend) {
        return res.status(404).json({ message: "Trend not found" });
      }
      res.json(trend);
    } catch (error) {
      console.error("Failed to update trend:", error);
      res.status(500).json({ message: "Failed to update trend" });
    }
  });

  // Opportunity Projects endpoints
  app.get("/api/opportunity-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const projects = await storage.getOpportunityProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch opportunity projects" });
    }
  });

  app.get("/api/opportunity-projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) return res.status(404).json({ message: "Not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/opportunity-projects/:id/implementation-preview", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const id = parseInt(req.params.id);
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const conceptId = project.relatedConceptIds?.[0];
      if (!conceptId) return res.status(400).json({ message: "No related concept found" });

      const concept = await storage.getConceptById(conceptId);
      if (!concept) return res.status(404).json({ message: "Concept not found" });

      // Check if implementation already exists
      const existing = await storage.getImplementationsByConceptId(conceptId);
      if (existing.length > 0) return res.json(existing[0]);

      // Generate preview
      const personalization = await storage.getUserPersonalization(userId);
      const preview = await generateImplementationPreview(
        concept,
        project.title,
        [],
        personalizationLearnerSummary(personalization),
      );
      const implementation = await storage.createImplementation({
        ...preview,
        userId,
        conceptId,
        status: "preview",
        version: 1,
      });

      res.json(implementation);
    } catch (error) {
      console.error("Preview generation error:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  app.post("/api/opportunity-projects/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { complexity = "same" } = req.body;
      
      const concepts = await storage.getConcepts(userId);
      if (concepts.length === 0) {
        return res.status(400).json({ message: "Add some concepts first to generate projects" });
      }

      const implementations = await storage.getImplementations(userId);
      const lastImplementation = implementations.length > 0 ? implementations[0] : null;
      
      const personalization = await storage.getUserPersonalization(userId);
      const generatedProjects = await generateOpportunityProjects(
        concepts, 
        personalization?.location || undefined,
        personalizationProjectContext(personalization),
        complexity,
        lastImplementation
      );
      
      const savedProjects = await Promise.all(
        generatedProjects.map(proj => {
          const conceptIds = concepts.slice(0, 2).map(c => c.id);
          const estimatedHours = parseInt(proj.estimatedTime?.match(/\d+/)?.[0] || "8");
          
          return storage.createOpportunityProject({
            userId,
            title: proj.projectName,
            summary: proj.reasons?.join(" ") || "No summary provided",
            difficulty: (proj.difficulty || "intermediate").toLowerCase(),
            estimatedHours,
            skills: proj.prerequisites || [],
            relatedConceptIds: conceptIds,
            recommendedImplementationId: null,
            locationContext: proj.locationContext || null,
            problemType: proj.problemType || "everyday",
          });
        })
      );
      
      res.status(201).json(savedProjects);
    } catch (error) {
      console.error("Project generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate projects" });
    }
  });

  app.post("/api/opportunity-projects/:id/interactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.params.id);
      const { action } = req.body;
      
      const interaction = await storage.createProjectInteraction({
        userId,
        projectId,
        action
      });
      res.status(201).json(interaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid interaction data" });
    }
  });

  // Resources endpoints
  app.get("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { prerequisite } = req.query;
      
      if (prerequisite) {
        const fetched = await fetchResourcesForPrerequisite(String(prerequisite));
        return res.json({ resources: fetched });
      }

      const userId = req.user!.id;
      const { conceptId, projectId } = req.query;
      
      const resources = await storage.getResources(
        userId,
        conceptId ? parseInt(String(conceptId)) : undefined,
        projectId ? parseInt(String(projectId)) : undefined
      );
      res.json(resources);
    } catch (error) {
      console.error("Resource fetch error:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources/save", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { resources, conceptId, projectId } = req.body;
      
      if (!Array.isArray(resources)) {
        return res.status(400).json({ message: "Resources array is required" });
      }

      const saved = await Promise.all(
        resources.map(resource => 
          storage.createResource({
            userId,
            conceptId: conceptId || null,
            projectId: projectId || null,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            source: resource.source || "external",
            description: resource.snippet || "",
            relevanceScore: resource.relevanceScore || 1.0
          })
        )
      );
      
      res.status(201).json(saved);
    } catch (error) {
      console.error("Resource save error:", error);
      res.status(500).json({ message: "Failed to save resources" });
    }
  });

  app.post("/api/resources/fetch", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { conceptId, projectId, title, prerequisites = [] } = req.body;
      
      if (!title || prerequisites.length === 0) {
        return res.status(400).json({ message: "Title and prerequisites are required" });
      }

      const resourcesByPrerequisite = await fetchResourcesForPrerequisites(prerequisites);
      const fetched = Object.values(resourcesByPrerequisite).flat();
      
      const saved = await Promise.all(
        fetched.map(resource => 
          storage.createResource({
            userId,
            conceptId: conceptId || null,
            projectId: projectId || null,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            source: resource.source,
            description: resource.snippet || null,
            relevanceScore: 0
          })
        )
      );
      
      res.status(201).json(saved);
    } catch (error) {
      console.error("Resource fetch error:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.get("/api/insights/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const concepts = await storage.getConcepts(req.user!.id);
      const subjectCounts = new Map<string, number>();

      for (const concept of concepts) {
        const subject = concept.category.trim() || "Uncategorized";
        subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
      }

      const subjectDistribution = Array.from(subjectCounts, ([subject, count]) => ({
        subject,
        count,
        percent: concepts.length
          ? Math.round((count / concepts.length) * 100)
          : 0,
      }));

      if (concepts.length === 0) {
        return res.json({
          patterns: [
            {
              pattern: "Your learning profile",
              insight: "Add concepts to start seeing your learning strengths and focus areas.",
            },
          ],
          suggestions: ["Add a concept to begin building your personalized insights."],
          subjectDistribution: [],
        });
      }

      const generated = await generateDynamicInsights(
        concepts.map(({ title, category }) => ({ title, category })),
      );
      const toStringList = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          : [];

      const patterns: Array<{ pattern: string; insight: string }> = [];
      if (generated.learnerProfile?.trim()) {
        patterns.push({
          pattern: "Your learning profile",
          insight: generated.learnerProfile.trim(),
        });
      }
      patterns.push(
        ...toStringList(generated.strengths).map((insight) => ({
          pattern: "Strength",
          insight,
        })),
        ...toStringList(generated.areasForImprovement).map((insight) => ({
          pattern: "Growth area",
          insight,
        })),
      );

      res.json({
        patterns,
        suggestions: toStringList(generated.suggestedNextTopics),
        subjectDistribution,
      });
    } catch (error) {
      console.error("Learning insights error:", error);
      res.status(500).json({ message: "Failed to load learning insights" });
    }
  });

  // Advanced AI Features
  app.post("/api/ai/analyze-knowledge-gaps", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const claimedKnowledge = await storage.getUserClaimedKnowledge(userId);
      
      const analysis = await analyzeKnowledgeGaps(concepts);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze knowledge gaps" });
    }
  });

  app.post("/api/ai/convert-implementation", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { implementation, targetLanguage } = req.body;
      const converted = await convertImplementation(implementation, targetLanguage);
      res.json(converted);
    } catch (error) {
      res.status(500).json({ message: "Failed to convert implementation" });
    }
  });

  // Claimed Knowledge endpoints
  app.get("/api/user-claimed-knowledge", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const knowledge = await storage.getUserClaimedKnowledge(userId);
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claimed knowledge" });
    }
  });

  app.post("/api/user-claimed-knowledge", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const knowledge = await storage.createUserClaimedKnowledge({
        ...req.body,
        userId: userId
      });
      res.status(201).json(knowledge);
    } catch (error) {
      res.status(400).json({ message: "Invalid knowledge data" });
    }
  });

  // SSE updates
  app.get("/api/sse-updates", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).end();
    
    const userId = req.user!.id;
    registerSSEClient(userId, res);
    
    req.on("close", () => {
      cleanupSSEClient(userId);
    });
  });

  // Data Privacy Endpoints
  app.post("/api/data/clear-chat-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const count = await storage.clearAllChatHistory();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  app.post("/api/data/clear-all-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const count = await storage.clearAllProjects();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear projects" });
    }
  });

  app.post("/api/data/delete-concepts-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const userConcepts = await storage.getConcepts(userId);
      let count = 0;
      for (const concept of userConcepts) {
        count += await storage.deleteConceptsWithProjects([concept.id]);
      }
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete concepts and projects" });
    }
  });

  app.post("/api/data/delete-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const result = await storage.deleteAllData();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
