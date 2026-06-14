import { supabaseAdmin } from "./db";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertConceptSchema, 
  insertChatSessionSchema, 
  insertChatMessageSchema,
  insertImplementationSchema,
  insertTrendSchema,
  insertOpportunityProjectSchema,
  insertProjectInteractionSchema,
  insertUserSettingsSchema,
  insertProjectFeedbackSchema,
  type ChatMessage
} from "@shared/schema";
import {
  generate5WH,
  generateInlinePrompt,
  generateChatResponse,
  generateTags,
  generateImplementationPreview,
  generateImplementationCode,
  selectBestProjectTemplate,
  filterOutMasteredPrerequisites,
  generateTrendContent,
  analyzeKnowledgeGaps,
  generateOpportunityProjects,
  generateDynamicInsights,
  scoreResources,
  suggestToolAlternatives,
  convertImplementation,
  validateCustomTool,
  extractValidJSON,
  regenerateFlowDiagram,
  chatForProjectPreferences,
  chatAboutIdea,
  analyzeIdeaReadiness
} from "./supabase-edge-functions";
import { fetchResourcesForPrerequisite, fetchResourcesForPrerequisites } from "./resource-fetcher";
import { registerSSEClient, cleanupSSEClient } from "./sse-generator";

// Helper function to generate and save projects
async function generateAndSaveProjects(userId: string) {
  const concepts = await storage.getConcepts(userId);
  if (concepts.length === 0) {
    throw new Error("No concepts found to generate projects");
  }
  
  const personalization = await storage.getUserPersonalization(userId);
  const ideaSessions = await storage.getIdeaSessions(userId);
  const ideaTitles = ideaSessions
    .map(s => s.title)
    .filter(Boolean)
    .slice(0, 5) as string[];

  const generatedProjects = await generateOpportunityProjects(
    concepts, 
    personalization?.location || undefined,
    personalization?.careerGoals || undefined,
    ideaTitles
  );
  
  const savedProjects = await Promise.all(
    generatedProjects.map((proj: any) => {
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
  const conceptTitles = concepts.map(c => c.title);
  const primaryCategory = concepts[0]?.category || "General";
  const generatedTrends = await generateTrendContent(conceptTitles, primaryCategory);
  
      const savedTrends = await Promise.all(
        generatedTrends.map(async (trend: any) => {
          const imageUrl = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(trend.title)}`;
          return storage.createTrend({
            userId,
            title: trend.title,
            content: trend.content,
            imageUrl: imageUrl,
            source: trend.source,
            relevanceToUser: trend.relevanceToUser,
            relatedConcepts: trend.relatedConcepts,
            category: trend.category,
            sourceUrl: null,
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
  // Health check — used by the Electron desktop app to know when the server is ready
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "knowledgelink" });
  });
  // Pass userId to daily check if possible, though it's hard without a request context
  // This would ideally be a cron job or similar, but for now we'll skip the auto-check 
  // until a user actually makes a request that can provide context.
  
  app.get("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      let p = await storage.getUserPersonalization(userId);
      if (!p) {
        p = await storage.createUserPersonalization({
          userId: userId,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null,
        });
      }
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });

  app.get("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      let p = await storage.getUserPersonalization(userId);
      if (!p) {
        p = await storage.createUserPersonalization({
          userId: userId,
          careerGoals: [],
          skillsFocus: [],
          preferredVoice: "",
          theme: "system",
          currentCareer: null,
          aspiringCareer: null,
          desiredRole: null,
          targetIndustry: null,
          yearsOfExperience: null,
          location: null,
          locationLastUpdated: null,
        });
      }
      res.json(p);
    } catch (error) {
      console.error("Failed to fetch personalization:", error);
      res.status(500).json({ message: "Failed to fetch personalization" });
    }
  });

  app.patch("/api/personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const p = await storage.getUserPersonalization(userId);
      if (!p) return res.status(404).json({ message: "Not found" });

      const allowedThemeFields: string[] = ["theme"];
      const safeUpdate: Record<string, unknown> = {};
      for (const key of allowedThemeFields) {
        if (key in req.body) safeUpdate[key] = req.body[key];
      }

      const updated = await storage.updateUserPersonalization(p.id, safeUpdate);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update personalization:", error);
      res.status(500).json({ message: "Failed to update" });
    }
  });

  app.patch("/api/user-personalization", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const p = await storage.getUserPersonalization(userId);
      if (!p) return res.status(404).json({ message: "Not found" });

      const allowedFields = [
        "careerGoals", "currentCareer", "aspiringCareer", "desiredRole",
        "targetIndustry", "yearsOfExperience", "skillsFocus", "preferredVoice",
        "theme", "location", "locationLastUpdated", "projectPreferences",
      ] as const;

      const safeUpdate: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in req.body) safeUpdate[key] = req.body[key];
      }

      const merged = { ...p, ...safeUpdate };
      const updated = await storage.updateUserPersonalization(p.id, merged);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update user personalization:", error);
      res.status(500).json({ message: "Failed to update" });
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

  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { avatarUrl } = req.body;
      
      // Basic check for data URL to ensure it's not a huge empty or broken string
      if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image/')) {
        const { data: updated, error } = await supabaseAdmin
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId)
          .select()
          .single();
        if (error) throw error;
        res.json({ ...req.user, avatarUrl });
      } else {
        res.status(400).json({ message: "Invalid image data" });
      }
    } catch (error) {
      console.error("Avatar update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      await storage.deleteUser(userId);
      req.logout((err) => {
        if (err) return res.status(500).json({ message: "Failed to logout after deletion" });
        res.sendStatus(204);
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Data management routes
  app.post("/api/data/clear-chat-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const count = await storage.clearAllChatHistory(userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Clear chat history error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
    }
  });

  app.post("/api/data/clear-all-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const count = await storage.clearAllProjects(userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Clear all projects error:", error);
      res.status(500).json({ message: "Failed to clear projects" });
    }
  });

  app.post("/api/data/delete-concepts-projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const userConcepts = await storage.getConcepts(userId);
      const conceptIds = userConcepts.map(c => c.id);
      const count = await storage.deleteConceptsWithProjects(conceptIds);
      // Also remove idea sessions
      await supabaseAdmin.from("idea_sessions").delete().eq("user_id", userId);
      res.json({ success: true, deleted: count });
    } catch (error) {
      console.error("Delete concepts error:", error);
      res.status(500).json({ message: "Failed to delete concepts and projects" });
    }
  });

  app.post("/api/data/delete-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const result = await storage.deleteAllData(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Delete all data error:", error);
      res.status(500).json({ message: "Failed to reset account data" });
    }
  });

  app.get("/api/implementations/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const versions = await storage.getProjectVersions(id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Concepts endpoints
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
      const userId = req.user?.id as string;
      
      const id = parseInt(req.params.id);
      const concept = await storage.getConceptById(id);
      if (!concept) {
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
      const id = parseInt(req.params.id);
      const concept = await storage.updateConcept(id, { lastAccessedAt: new Date() } as any);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.patch("/api/implementations/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updates: any = { lastAccessedAt: new Date() };
      if (status) {
        updates.status = status;
      }
      const implementation = await storage.updateImplementation(id, updates);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.patch("/api/opportunity-projects/:id/access", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateOpportunityProject(id, { lastAccessedAt: new Date() } as any);
      if (!project) {
        return res.status(404).json({ message: "Opportunity project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access time" });
    }
  });

  app.post("/api/concepts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid User Session" });
      }
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
      const id = parseInt(req.params.id);
      const updates = req.body;
      const concept = await storage.updateConcept(id, updates);
      if (!concept) {
        return res.status(404).json({ message: "Concept not found" });
      }
      res.json(concept);
    } catch (error) {
      res.status(500).json({ message: "Failed to update concept" });
    }
  });

  app.delete("/api/concepts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
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
      const conceptId = parseInt(req.params.conceptId);
      const session = await storage.getChatSessionByConceptId(conceptId);
      res.json(session || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.get("/api/implementations/:implementationId/chat-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const implementationId = parseInt(req.params.implementationId);
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
      res.status(500).json({ message: "Failed to generate prompt" });
    }
  });

  app.post("/api/ai/chat-response", async (req, res) => {
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
      const learnerProfile = await storage.getLatestLearnerProfile(userId);
      
      const preview = await generateImplementationPreview(
        concept,
        conversationHistory,
        userConcepts,
        learnerProfile?.profile || ""
      );
      
      const implementation = await storage.createImplementation({
        userId,
        conceptId,
        projectName: preview.projectName || `${concept.title} Project`,
        type: preview.type || "Application",
        tool: preview.tool || "Python",
        language: preview.language || "Python",
        components: preview.components || [],
        learningGoals: preview.learningGoals || [],
        problemAddressed: preview.problemAddressed || "",
        whySuggested: preview.whySuggested || "",
        realWorldContext: preview.realWorldContext || "",
        industry: preview.industry || "",
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
    try {
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }
      res.json(implementation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch implementation" });
    }
  });

  app.get("/api/implementations/similar", async (req, res) => {
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

  app.post("/api/implementations/:id/regenerate-flow", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const implementation = await storage.getImplementationById(id, req.user!.id);
      if (!implementation) return res.status(404).json({ message: "Implementation not found" });

      const flowDiagram = await regenerateFlowDiagram({
        projectName: implementation.projectName,
        code: implementation.code,
        pseudocode: implementation.pseudocode,
        problemAddressed: implementation.problemAddressed,
      });

      const updated = await storage.updateImplementation(id, { flowDiagram });
      res.json(updated);
    } catch (error) {
      console.error("Failed to regenerate flow diagram:", error);
      res.status(500).json({ message: "Failed to regenerate flow diagram" });
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
      const metObjectives = req.body.metObjectives || [];
      const implementationId = req.body.implementationId;
      
      // Save prerequisites as mastered
      if (metObjectives.length > 0) {
        await storage.saveMasteredPrerequisites(
          metObjectives.map((obj: any) => ({
            userId,
            implementationId,
            prerequisite: String(obj)
          }))
        );
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
  async function getTrendImage(query: string): Promise<string | null> {
    try {
      const searchUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=${process.env.UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_KEY'}`;
      // Fallback to a better source if Unsplash key isn't provided
      return `https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800&q=${encodeURIComponent(query)}`;
    } catch (e) {
      return null;
    }
  }

  app.get("/api/trends", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      
      const trends = await storage.getTrends(userId);
      res.json(trends);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  app.post("/api/trends/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const trends = await generateAndSaveTrends(userId);
      res.json(trends);
    } catch (error) {
      console.error("Failed to generate trends:", error);
      res.status(500).json({ message: "Failed to generate trends" });
    }
  });

  app.get("/api/insights/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const projects = await storage.getOpportunityProjects(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const feedback = await storage.getProjectFeedbackByUser(userId);
      
      const insights = await generateDynamicInsights(concepts, projects, personalization, feedback);
      res.json(insights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.patch("/api/trends/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const trend = await storage.updateTrend(id, updates);
      if (!trend) {
        return res.status(404).json({ message: "Trend not found" });
      }
      res.json(trend);
    } catch (error) {
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

  app.post("/api/opportunity-projects/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      console.log(`[DEBUG] Generating projects for user ${userId}`);
      const projects = await generateAndSaveProjects(userId);
      console.log(`[DEBUG] Successfully generated ${projects.length} projects`);
      res.status(201).json(projects);
    } catch (error) {
      console.error("Project generation error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate projects",
        stack: error instanceof Error ? error.stack : undefined
      });
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

  app.get("/api/opportunity-projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const project = await storage.getOpportunityProjectById(id, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.delete("/api/opportunity-projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOpportunityProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { prerequisite, implementationId } = req.body;
      const saved = await storage.saveMasteredPrerequisites([{
        userId,
        prerequisite,
        implementationId: implementationId || 0
      }]);
      res.status(201).json(saved[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to save mastered prerequisite" });
    }
  });

  app.delete("/api/user-mastered-prerequisites", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { prerequisite } = req.body;
      // We need a delete method in storage
      // For now, let's just add it to storage later or use a raw query if possible
      // But let's stick to storage interface
      res.status(501).json({ message: "Not implemented" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.get("/api/resources", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { conceptId, projectId, prerequisite } = req.query;
      
      let resources;
      if (prerequisite) {
        // Search by prerequisite name (used by SmartReadiness)
        resources = await storage.getResourcesByPrerequisite(userId, String(prerequisite));
        
        // If no resources found in DB, fetch them with AI-powered specificity
        if (resources.length === 0) {
          const { fetchResourcesForPrerequisite } = await import("./resource-fetcher");
          const { scoreResources } = await import("./supabase-edge-functions");
          
          const rawResources = await fetchResourcesForPrerequisite(String(prerequisite));
          if (rawResources.length > 0) {
            // Score using Supabase edge function (has real Gemini/Groq keys)
            let scoredResources: any[] = rawResources;
            try {
              const scores = await scoreResources(rawResources, String(prerequisite));
              if (Array.isArray(scores) && scores.length === rawResources.length) {
                scoredResources = rawResources.map((r, i) => ({
                  ...r,
                  relevanceScore: scores[i]?.relevanceScore ?? 70,
                }));
              }
            } catch (scoreErr) {
              console.warn("Resource scoring failed, using unscored resources:", scoreErr);
              scoredResources = rawResources.map((r, i) => ({ ...r, relevanceScore: Math.max(50, 90 - i * 5) }));
            }

            // Sort by relevance — videos first among same score
            scoredResources.sort((a, b) => {
              const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
              if (scoreDiff !== 0) return scoreDiff;
              if (a.type === "video" && b.type !== "video") return -1;
              if (b.type === "video" && a.type !== "video") return 1;
              return 0;
            });

            resources = await Promise.all(
              scoredResources.map(resource => 
                storage.createResource({
                  userId,
                  conceptId: conceptId ? parseInt(String(conceptId)) : null,
                  projectId: projectId ? parseInt(String(projectId)) : null,
                  title: resource.title,
                  url: resource.url,
                  type: resource.type,
                  source: resource.source,
                  description: resource.snippet || resource.description || "",
                  relevanceScore: typeof resource.relevanceScore === "number"
                    ? (resource.relevanceScore <= 1 ? Math.round(resource.relevanceScore * 100) : Math.min(100, Math.round(resource.relevanceScore)))
                    : 70,
                  prerequisite: String(prerequisite)
                })
              )
            );
          }
        }
      } else {
        resources = await storage.getResources();
      }
      res.json(resources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
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

      // 1. Fetch from external sources
      const { fetchResourcesForPrerequisites } = await import("./resource-fetcher");
      const fetched = await fetchResourcesForPrerequisites(prerequisites);
      
      // 2. Score them using AI (optional or simplified)
      // For now we'll just use the fetched resources directly as they are already categorized
      
      const allResources: any[] = [];
      for (const [prereq, resources] of Object.entries(fetched)) {
        for (const resource of resources) {
          allResources.push({
            ...resource,
            prerequisite: prereq
          });
        }
      }

      // 3. Save to database
      const saved = await Promise.all(
        allResources.map(resource => 
          storage.createResource({
            userId,
            conceptId: conceptId || null,
            projectId: projectId || null,
            title: resource.title,
            url: resource.url,
            type: resource.type,
            source: resource.source,
            description: resource.snippet || "",
            relevanceScore: 100 // Default high score for fetched resources
          })
        )
      );
      
      res.status(201).json(saved);
    } catch (error) {
      console.error("Resource fetch error:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.get("/api/implementations/:id/suggestions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const excluded = req.query.excluded ? String(req.query.excluded).split(",") : [];
      const suggestions = await suggestToolAlternatives(
        implementation.tool,
        implementation.type || "general"
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  app.post("/api/implementations/:id/convert", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { targetLanguage } = req.body;

      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      // 1. Convert the implementation using AI
      const converted = await convertImplementation(implementation, targetLanguage);

      // 2. Create a new implementation version
      const newVersion = await storage.createImplementation({
        userId,
        conceptId: implementation.conceptId,
        projectName: implementation.projectName,
        type: implementation.type,
        tool: targetLanguage,
        language: targetLanguage,
        problemAddressed: implementation.problemAddressed,
        whySuggested: implementation.whySuggested,
        realWorldContext: implementation.realWorldContext,
        industry: implementation.industry,
        instructions: converted.instructions,
        code: converted.code,
        pseudocode: converted.pseudocode,
        flowDiagram: converted.flowDiagram,
        status: "in_progress", // Converted projects should also be in_progress
        version: (implementation.version || 1) + 1,
        previousVersionId: implementation.id,
        imageUrl: implementation.imageUrl,
        components: implementation.components,
        learningGoals: implementation.learningGoals,
        expectedOutcomes: implementation.expectedOutcomes,
        requiredArtifacts: implementation.requiredArtifacts,
      });

      res.status(201).json(newVersion);
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ message: "Failed to convert implementation" });
    }
  });

  app.post("/api/implementations/:id/validate-tool", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { tool } = req.body;
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      const result = await validateCustomTool(
        implementation.projectName,
        implementation.problemAddressed || "",
        tool
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate tool" });
    }
  });

  // Advanced AI Features
  app.post("/api/ai/analyze-knowledge-gaps", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const claimedKnowledge = await storage.getUserClaimedKnowledge(userId);
      
      const analysis = await analyzeKnowledgeGaps(concepts, claimedKnowledge);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze knowledge gaps" });
    }
  });

  app.post("/api/ai/generate-dynamic-insights", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const projects = await storage.getOpportunityProjects(userId);
      const personalization = await storage.getUserPersonalization(userId);
      
      const insights = await generateDynamicInsights(concepts, projects, personalization);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate dynamic insights" });
    }
  });

  app.post("/api/ai/suggest-tools", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { currentTool, targetLanguage, projectType } = req.body;
      const suggestions = await suggestToolAlternatives(currentTool, targetLanguage, projectType);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to suggest tools" });
    }
  });

  app.post("/api/ai/convert-implementation", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { implementation, targetType, targetTool, targetLanguage } = req.body;
      const converted = await convertImplementation(implementation, targetType, targetTool, targetLanguage);
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

  // Project Implementation Generation
  app.post("/api/implementations/:id/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;

      // Check if the ID refers to an opportunity project FIRST, because opportunity project IDs
      // and implementation IDs share the same number space and can collide. We must never
      // accidentally generate into an unrelated existing implementation.
      const opportunity = await storage.getOpportunityProjectById(id, userId);

      let implementation;
      if (opportunity) {
        // Always create a fresh implementation from the opportunity project
        implementation = await storage.createImplementation({
          conceptId: opportunity.relatedConceptIds?.[0] || 0,
          userId: userId,
          projectName: opportunity.title,
          type: "Implementation Project",
          tool: "General",
          language: "General",
          components: opportunity.skills || [],
          learningGoals: [opportunity.summary],
          status: "preview",
          code: "",
          whySuggested: "Converted from opportunity project",
        });

        // Update the opportunity project with the new implementation ID
        await storage.updateOpportunityProject(opportunity.id, {
          recommendedImplementationId: implementation.id
        });
      } else {
        // Not an opportunity project — look for an existing implementation
        implementation = await storage.getImplementationById(id, userId);
      }

      if (!implementation) {
        return res.status(404).json({ message: "Implementation or Opportunity Project not found" });
      }

      const concept = await storage.getConceptById(implementation.conceptId);
      // For opportunity projects, we might not have a full concept object, create a shell one if needed
      const effectiveConcept = concept || { id: implementation.conceptId, name: implementation.projectName, description: (implementation.learningGoals ?? [])[0] ?? "" };

      // Generate a unique ID for this generation session
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Start generation in background
      (async () => {
        try {
          const result = await generateImplementationCode(
            effectiveConcept,
            implementation.type,
            implementation.tool,
            implementation.language
          );

          if (!result.code || result.code.trim().length < 50) {
            throw new Error("Generation produced empty or insufficient code content. Please try again.");
          }

          if (!result.instructions || result.instructions.trim().length < 20) {
            throw new Error("Generation produced empty or insufficient instructions. Please try again.");
          }

          await storage.updateImplementation(implementation.id, {
            instructions: result.instructions,
            code: result.code,
            pseudocode: result.pseudocode || "",
            flowDiagram: result.flowDiagram || "",
            status: "preview"
          });

          const { cleanupSSEClient, isGenerationCanceled, sendCompleted } = await import("./sse-generator");
          if (isGenerationCanceled(generationId)) {
            console.log(`[API] Generation ${generationId} was canceled before save, skipping update.`);
            return;
          }
          
          // Send completion event with the (potentially new) implementation ID
          sendCompleted(generationId, { implementationId: implementation.id });
          cleanupSSEClient(generationId);
        } catch (error) {
          if (error instanceof Error && error.message === "CANCELED") {
            console.log(`[API] Generation ${generationId} stopped due to cancellation.`);
            return;
          }
          console.error("Background generation error:", error);
          // Mark the implementation as failed so it doesn't stay stuck in-progress
          try {
            await storage.updateImplementation(implementation.id, {
              status: "failed"
            });
          } catch (updateErr) {
            console.error("Failed to update implementation status to failed:", updateErr);
          }
          const { sendError } = await import("./sse-generator");
          sendError(generationId, error instanceof Error ? error.message : "Unknown error");
        }
      })();

      res.json({ generationId });
    } catch (error) {
      console.error("Generation start error:", error);
      res.status(500).json({ message: "Failed to start generation" });
    }
  });

  app.get("/api/implementations/:id/generate-stream/:genId", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const genId = req.params.genId;
    registerSSEClient(genId, res);
  });

  app.post("/api/implementations/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const { surveyData, feedback, masteredPrerequisites = [] } = req.body;

      // Mark the current implementation complete
      await storage.updateImplementation(id, { status: "completed" });

      // Also mark every other tool version of the same project as complete
      const allVersions = await storage.getProjectVersions(id);
      await Promise.all(
        allVersions
          .filter(v => v.id !== id)
          .map(v => storage.updateImplementation(v.id, { status: "completed" }))
      );

      // Handle both old and new feedback formats
      const finalFeedback = surveyData || feedback;

      if (finalFeedback) {
        await storage.createProjectFeedback({
          userId,
          implementationId: id,
          difficultyRating: finalFeedback.difficultyRating,
          enjoymentRating: finalFeedback.enjoymentRating || 3,
          metObjectives: finalFeedback.metObjectives,
          learntSkills: finalFeedback.learntSkills,
          outcomeMatches: finalFeedback.outcomeMatches,
          feedbackText: finalFeedback.feedbackText,
        });

        // Save mastered prerequisites
        const skills = finalFeedback.learntSkills || masteredPrerequisites;
        if (skills && skills.length > 0) {
          const prerequisites = skills.map((s: string) => ({
            userId,
            implementationId: id,
            prerequisite: s,
          }));
          await storage.saveMasteredPrerequisites(prerequisites);
        }
      }

      res.json({ message: "Project marked as complete" });
    } catch (error) {
      console.error("Complete implementation error:", error);
      res.status(500).json({ message: "Failed to complete implementation" });
    }
  });

  // Report generation endpoint
  app.get("/api/implementations/:id/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const implementation = await storage.getImplementationById(id, userId);
      if (!implementation) {
        return res.status(404).json({ message: "Implementation not found" });
      }

      // Generate HTML content that can be opened in Word
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${implementation.projectName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 20px; }
          .metadata { background: #f3f4f6; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          ul { margin-left: 20px; }
          pre { background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        </style>
        </head>
        <body>
          <h1>Project Report: ${implementation.projectName}</h1>
          <div class="metadata">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${implementation.status}</p>
            <p><strong>Tool/Language:</strong> ${implementation.tool} / ${implementation.language}</p>
          </div>

          <div class="section">
            <h2>Overview</h2>
            <p>${implementation.problemAddressed || "No overview provided."}</p>
          </div>

          <div class="section">
            <h2>Learning Goals</h2>
            <ul>
              ${implementation.learningGoals?.map(goal => `<li>${goal}</li>`).join('') || "<li>No learning goals specified.</li>"}
            </ul>
          </div>

          <div class="section">
            <h2>Expected Outcomes</h2>
            <ul>
              ${implementation.expectedOutcomes?.map(outcome => `<li>${outcome}</li>`).join('') || "<li>No outcomes specified.</li>"}
            </ul>
          </div>

          <div class="section">
            <h2>Instructions</h2>
            <div>${implementation.instructions?.replace(/\n/g, '<br>') || "Instructions not available."}</div>
          </div>

          <div class="section">
            <h2>Source Code</h2>
            <pre>${implementation.code || "Code not available."}</pre>
          </div>

          <p style="text-align: center; color: #666; font-size: 0.8em; margin-top: 50px;">
            Generated by Readiness Learning Platform
          </p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="${implementation.projectName.toLowerCase().replace(/\s+/g, "_")}_report.doc"`);
      res.send(Buffer.from('\ufeff' + htmlContent, 'utf-8'));
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.post("/api/project-preference-chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = req.user!.id;
      const { conceptTitle, conceptCategory, conversationHistory } = req.body;

      if (!conceptTitle || !conceptCategory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const personalization = await storage.getUserPersonalization(userId);

      const lastUserMessage = Array.isArray(conversationHistory)
        ? (conversationHistory[conversationHistory.length - 1]?.content || "")
        : "";
      const result = await chatForProjectPreferences(conversationHistory, lastUserMessage) as any;
      // Edge function returns { response: "...", extractedPreferences: {...} }; frontend expects { reply, extractedPreferences }
      const extractedPreferences = result?.extractedPreferences || {
        preferredComplexity: null, preferredApproach: null, preferredTools: [],
        topicLean: null, additionalNotes: "", confidenceLevel: 0, isReadyToGenerate: false,
      };

      if (extractedPreferences.isReadyToGenerate && extractedPreferences.confidenceLevel > 0.3) {
        const p = personalization;
        if (p) {
          const newPrefs = {
            ...extractedPreferences,
            confidenceLevel: Math.min(extractedPreferences.confidenceLevel * 0.6, 0.6),
          };
          delete (newPrefs as any).isReadyToGenerate;
          await storage.updateUserPersonalization(p.id, {
            projectPreferences: newPrefs
          });
        }
      }

      res.json({
        reply: result?.response || result?.reply || "",
        extractedPreferences,
      });
    } catch (error) {
      console.error("Project preference chat error:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // ==================== IDEA SESSION ROUTES ====================

  app.get("/api/idea-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const sessions = await storage.getIdeaSessions(req.user!.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch idea sessions" });
    }
  });

  app.post("/api/idea-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { title, messages, ideaSummary, analysis, status, projectId } = req.body;
      const session = await storage.createIdeaSession({
        userId: req.user!.id,
        title: title || "New Idea",
        messages: messages || [],
        ideaSummary: ideaSummary || null,
        analysis: analysis || null,
        status: status || "chatting",
        projectId: projectId || null,
      });
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create idea session" });
    }
  });

  app.patch("/api/idea-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateIdeaSession(id, req.body);
      if (!updated) return res.status(404).json({ message: "Session not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update idea session" });
    }
  });

  app.delete("/api/idea-sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIdeaSession(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete idea session" });
    }
  });

  // ==================== IDEA BUILDER ROUTES ====================

  app.post("/api/ideas/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { messages, isRefining } = req.body;
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const history = messages || [];
      const lastMsg = history[history.length - 1]?.content || "";
      const ideaSummary = history.find((m: any) => m.role === "assistant")?.content || lastMsg;
      const result = await chatAboutIdea(ideaSummary, history, lastMsg) as any;
      // Edge function returns { response: text }; frontend expects { reply: text }
      res.json({
        reply: result?.response || result?.reply || "",
        isReadyToAnalyze: result?.isReadyToAnalyze || false,
        ideaSummary: result?.ideaSummary,
      });
    } catch (error) {
      console.error("Idea chat error:", error);
      res.status(500).json({ message: "Failed to process idea chat" });
    }
  });

  app.post("/api/ideas/analyze", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { ideaSummary, chatHistory } = req.body;
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const personalization = await storage.getUserPersonalization(userId);
      const raw = await analyzeIdeaReadiness(ideaSummary, chatHistory || []) as any;

      // Helper: normalize an alreadyHas item — Groq uses varied key names
      const normalizeAlreadyHas = (items: any[]): { skill: string; matchedConcept: string }[] =>
        (items || []).map((it: any) => ({
          skill: it.skill || it.name || it.skillName || it.title || "",
          matchedConcept: it.matchedConcept || it.concept || it.matched || it.matchedSkill || it.via || "",
        })).filter((it: any) => it.skill);

      // Helper: normalize a missing-skill item
      const normalizeMissing = (items: any[]): any[] =>
        (items || []).map((m: any) => ({
          skill: m.skill || m.name || m.skillName || m.title || "",
          importance: m.importance || m.priority || "helpful",
          resources: m.resources || m.links || [],
        })).filter((m: any) => m.skill);

      // Normalize: Groq sometimes returns nested `project` object instead of flat keys
      let analysis: any = raw;
      if (!raw.projectName && (raw.project || raw.projectDetails)) {
        const p = raw.project || raw.projectDetails || {};
        analysis = {
          projectName: p.name || p.projectName || "Your Project",
          projectType: p.type || p.projectType || "Application",
          description: p.description || raw.description || "",
          difficulty: ((p.difficulty || raw.difficulty || "intermediate") as string).toLowerCase(),
          estimatedHours: p.estimatedHours || raw.estimatedHours || 8,
          requiredSkills: p.requiredSkills || raw.requiredSkills || [],
          alreadyHas: normalizeAlreadyHas(raw.alreadyHas || p.alreadyHas || []),
          missing: normalizeMissing(raw.missing || p.missing || []),
          readinessScore: raw.readinessScore ?? p.readinessScore ?? 50,
          summary: raw.summary || p.summary || "",
        };
      } else {
        // Ensure flat structure is complete with safe defaults
        analysis = {
          projectName: raw.projectName || "Your Project",
          projectType: raw.projectType || "Application",
          description: raw.description || "",
          difficulty: ((raw.difficulty || "intermediate") as string).toLowerCase(),
          estimatedHours: raw.estimatedHours || 8,
          requiredSkills: raw.requiredSkills || [],
          alreadyHas: normalizeAlreadyHas(raw.alreadyHas || []),
          missing: normalizeMissing(raw.missing || []),
          readinessScore: raw.readinessScore ?? 50,
          summary: raw.summary || "",
        };
      }

      // Fetch real learning resources for missing skills that have none
      const missingWithoutResources = analysis.missing.filter((m: any) => (m.resources?.length ?? 0) === 0);
      if (missingWithoutResources.length > 0) {
        const fetchedMap = await fetchResourcesForPrerequisites(
          missingWithoutResources.map((m: any) => m.skill)
        );
        analysis.missing = analysis.missing.map((m: any) => {
          if ((m.resources?.length ?? 0) > 0) return m;
          const fetched = fetchedMap[m.skill] || [];
          // Keep top 3: prefer youtube + wikipedia/duckduckgo pair
          const topResources = fetched.slice(0, 3).map((r: any) => ({
            type: r.type,
            title: r.title,
            url: r.url,
          }));
          return { ...m, resources: topResources };
        });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Idea analysis error:", error);
      res.status(500).json({ message: "Failed to analyze idea" });
    }
  });

  app.post("/api/ideas/create-project", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { analysis } = req.body;
      const userId = req.user!.id;
      const concepts = await storage.getConcepts(userId);
      const conceptIds = concepts.slice(0, 2).map((c: any) => c.id);
      // Parse estimatedHours — AI sometimes returns a range string like "120-150"
      const rawHours = analysis.estimatedHours;
      const estimatedHours = (() => {
        if (typeof rawHours === "number") return Math.round(rawHours);
        if (typeof rawHours === "string") {
          const firstNum = parseInt(rawHours.split(/[-–,]/)[0].trim(), 10);
          return isNaN(firstNum) ? 8 : firstNum;
        }
        return 8;
      })();

      const project = await storage.createOpportunityProject({
        userId,
        title: analysis.projectName,
        summary: analysis.description,
        difficulty: (analysis.difficulty || "intermediate").toLowerCase(),
        estimatedHours,
        skills: analysis.requiredSkills || [],
        relatedConceptIds: conceptIds,
        recommendedImplementationId: null,
        locationContext: null,
        problemType: "idea-driven",
      });
      res.json({ projectId: project.id });
    } catch (error) {
      console.error("Idea create project error:", error);
      res.status(500).json({ message: "Failed to create project from idea" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
