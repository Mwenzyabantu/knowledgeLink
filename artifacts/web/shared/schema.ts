import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// ============================================================
// PROFILES (Supabase auth.users + public.profiles)
// id is the Supabase auth UUID (text)
// ============================================================
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").unique().notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Keep "users" as an alias so existing imports don't break
export const users = profiles;

// Manual type definitions — these match what storage returns (camelCase)
export type User = {
  id: string; // Supabase UUID
  username: string;
  email: string;
  password?: string | null; // not stored in Supabase; kept for compat with passport types
  avatarUrl: string | null;
  createdAt: Date;
};

export const insertUserSchema = z.object({
  id: z.string().optional(),
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  avatarUrl: z.string().optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// ============================================================
// CONCEPTS
// userId is Supabase UUID (text) referencing auth.users
// ============================================================
export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  originalInput: text("original_input"),
  title: text("title").notNull(),
  category: text("category").notNull(),
  problem: text("problem").notNull(),
  what: text("what").notNull(),
  why: text("why").notNull(),
  how: text("how").notNull(),
  where: jsonb("where_applications").$type<string[]>().notNull(),
  who: text("who").notNull(),
  when: text("when_context").notNull(),
  pseudocode: text("pseudocode"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isFavorite: boolean("is_favorite").default(false),
  prerequisites: jsonb("prerequisites").$type<{
    essential: string[];
    helpful: string[];
    optional: string[];
  }>().default({ essential: [], helpful: [], optional: [] }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

export const insertConceptSchema = z.object({
  userId: z.string().optional().nullable(),
  originalInput: z.string().optional().nullable(),
  title: z.string(),
  category: z.string(),
  problem: z.string(),
  what: z.string(),
  why: z.string(),
  how: z.string(),
  where: z.array(z.string()),
  who: z.string(),
  when: z.string(),
  pseudocode: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isFavorite: z.boolean().optional().nullable(),
  prerequisites: z.object({
    essential: z.array(z.string()),
    helpful: z.array(z.string()),
    optional: z.array(z.string()),
  }).optional().nullable(),
  lastAccessedAt: z.date().optional().nullable(),
});

export type InsertConcept = z.infer<typeof insertConceptSchema>;
export type Concept = typeof concepts.$inferSelect;

// ============================================================
// CHAT SESSIONS
// ============================================================
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  conceptId: integer("concept_id"),
  projectId: integer("project_id"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isCollapsed: boolean("is_collapsed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const insertChatSessionSchema = z.object({
  userId: z.string().optional().nullable(),
  type: z.string(),
  conceptId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isCollapsed: z.boolean().optional().nullable(),
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

// ============================================================
// CHAT MESSAGES
// ============================================================
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: text("user_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = z.object({
  sessionId: z.number(),
  userId: z.string().optional().nullable(),
  role: z.string(),
  content: z.string(),
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ============================================================
// TRENDS
// ============================================================
export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  imageDescription: text("image_description"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  relevanceToUser: text("relevance_to_user").notNull(),
  relatedConcepts: jsonb("related_concepts").$type<string[]>().default([]),
  category: text("category").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  readByUser: boolean("read_by_user").default(false),
  userRating: integer("user_rating"),
});

export const insertTrendSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string(),
  content: z.string(),
  imageUrl: z.string().optional().nullable(),
  imageDescription: z.string().optional().nullable(),
  source: z.string(),
  sourceUrl: z.string().optional().nullable(),
  relevanceToUser: z.string(),
  relatedConcepts: z.array(z.string()).optional().nullable(),
  category: z.string(),
  readByUser: z.boolean().optional().nullable(),
  userRating: z.number().optional().nullable(),
});

export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type Trend = typeof trends.$inferSelect;

// ============================================================
// IMPLEMENTATIONS (Projects)
// ============================================================
export const implementations = pgTable("implementations", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id").notNull(),
  chatHistoryId: integer("chat_history_id"),
  projectName: text("project_name").notNull(),
  type: text("type").notNull(),
  tool: text("tool").notNull(),
  language: text("language").notNull(),
  imageUrl: text("image_url"),
  components: jsonb("components").$type<string[]>().default([]),
  learningGoals: jsonb("learning_goals").$type<string[]>().default([]),
  expectedOutcomes: jsonb("expected_outcomes").$type<string[]>().default([]),
  requiredArtifacts: jsonb("required_artifacts").$type<string[]>().default([]),
  problemAddressed: text("problem_addressed"),
  whySuggested: text("why_suggested"),
  realWorldContext: text("real_world_context"),
  industry: text("industry"),
  code: text("code"),
  pseudocode: text("pseudocode"),
  flowDiagram: text("flow_diagram"),
  instructions: text("instructions"),
  status: text("status").notNull().default("preview"),
  version: integer("version").default(1).notNull(),
  previousVersionId: integer("previous_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

export const insertImplementationSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number(),
  chatHistoryId: z.number().optional().nullable(),
  projectName: z.string(),
  type: z.string(),
  tool: z.string(),
  language: z.string(),
  imageUrl: z.string().optional().nullable(),
  components: z.array(z.string()).optional().nullable(),
  learningGoals: z.array(z.string()).optional().nullable(),
  expectedOutcomes: z.array(z.string()).optional().nullable(),
  requiredArtifacts: z.array(z.string()).optional().nullable(),
  problemAddressed: z.string().optional().nullable(),
  whySuggested: z.string().optional().nullable(),
  realWorldContext: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  pseudocode: z.string().optional().nullable(),
  flowDiagram: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  version: z.number().optional().nullable(),
  previousVersionId: z.number().optional().nullable(),
  lastAccessedAt: z.date().optional().nullable(),
});

export type InsertImplementation = z.infer<typeof insertImplementationSchema>;
export type Implementation = typeof implementations.$inferSelect;

// ============================================================
// PROJECT FEEDBACK
// ============================================================
export const projectFeedback = pgTable("project_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  implementationId: integer("implementation_id").notNull(),
  difficultyRating: integer("difficulty_rating").notNull(),
  enjoymentRating: integer("enjoyment_rating").notNull(),
  metObjectives: jsonb("met_objectives").$type<string[]>().default([]),
  learntSkills: jsonb("learnt_skills").$type<string[]>().default([]),
  outcomeMatches: boolean("outcome_matches").default(true),
  feedbackText: text("feedback_text"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertProjectFeedbackSchema = z.object({
  userId: z.string().optional().nullable(),
  implementationId: z.number(),
  difficultyRating: z.number(),
  enjoymentRating: z.number(),
  metObjectives: z.array(z.string()).optional().nullable(),
  learntSkills: z.array(z.string()).optional().nullable(),
  outcomeMatches: z.boolean().optional().nullable(),
  feedbackText: z.string().optional().nullable(),
});

export type InsertProjectFeedback = z.infer<typeof insertProjectFeedbackSchema>;
export type ProjectFeedback = typeof projectFeedback.$inferSelect;

// ============================================================
// OPPORTUNITY PROJECTS
// ============================================================
export const opportunityProjects = pgTable("opportunity_projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  relatedConceptIds: jsonb("related_concept_ids").$type<number[]>().default([]),
  recommendedImplementationId: integer("recommended_implementation_id"),
  locationContext: text("location_context"),
  problemType: text("problem_type").default("everyday"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
});

export const insertOpportunityProjectSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string(),
  summary: z.string(),
  difficulty: z.string(),
  estimatedHours: z.number(),
  skills: z.array(z.string()),
  relatedConceptIds: z.array(z.number()).optional().nullable(),
  recommendedImplementationId: z.number().optional().nullable(),
  locationContext: z.string().optional().nullable(),
  problemType: z.string().optional().nullable(),
});

export type InsertOpportunityProject = z.infer<typeof insertOpportunityProjectSchema>;
export type OpportunityProject = typeof opportunityProjects.$inferSelect;

// ============================================================
// PROJECT INTERACTIONS
// ============================================================
export const projectInteractions = pgTable("project_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  projectId: integer("project_id").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectInteractionSchema = z.object({
  userId: z.string().optional().nullable(),
  projectId: z.number(),
  action: z.string(),
});

export type InsertProjectInteraction = z.infer<typeof insertProjectInteractionSchema>;
export type ProjectInteraction = typeof projectInteractions.$inferSelect;

// ============================================================
// GENERATION TRACKING
// ============================================================
export const generationTracking = pgTable("generation_tracking", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  lastDailyGeneration: timestamp("last_daily_generation"),
  conceptCountSinceLastGeneration: integer("concept_count_since_last_generation").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGenerationTrackingSchema = z.object({
  userId: z.string().optional().nullable(),
  lastDailyGeneration: z.date().optional().nullable(),
  conceptCountSinceLastGeneration: z.number().optional().nullable(),
});

export type InsertGenerationTracking = z.infer<typeof insertGenerationTrackingSchema>;
export type GenerationTracking = typeof generationTracking.$inferSelect;

// ============================================================
// LEARNER PROFILES
// ============================================================
export const learnerProfiles = pgTable("learner_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  profile: text("profile").notNull(),
  conceptsIncluded: jsonb("concepts_included").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLearnerProfileSchema = z.object({
  userId: z.string().optional().nullable(),
  profile: z.string(),
  conceptsIncluded: z.array(z.number()),
});

export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;

// ============================================================
// USER CLAIMED KNOWLEDGE
// ============================================================
export const userClaimedKnowledge = pgTable("user_claimed_knowledge", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id").notNull(),
  source: text("source").notNull().default("other"),
  proficiencyLevel: text("proficiency_level").notNull().default("intermediate"),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
});

export const insertUserClaimedKnowledgeSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number(),
  source: z.string().optional(),
  proficiencyLevel: z.string().optional(),
});

export type InsertUserClaimedKnowledge = z.infer<typeof insertUserClaimedKnowledgeSchema>;
export type UserClaimedKnowledge = typeof userClaimedKnowledge.$inferSelect;

// ============================================================
// RESOURCES
// ============================================================
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  conceptId: integer("concept_id"),
  projectId: integer("project_id"),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  source: text("source").notNull(),
  description: text("description"),
  relevanceScore: integer("relevance_score").default(50),
  prerequisite: text("prerequisite"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export const insertResourceSchema = z.object({
  userId: z.string().optional().nullable(),
  conceptId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  title: z.string(),
  url: z.string(),
  type: z.string(),
  source: z.string(),
  description: z.string().optional().nullable(),
  relevanceScore: z.number().optional().nullable(),
  prerequisite: z.string().optional().nullable(),
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// ============================================================
// USER MASTERED PREREQUISITES
// ============================================================
export const userMasteredPrerequisites = pgTable("user_mastered_prerequisites", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  implementationId: integer("implementation_id").notNull(),
  prerequisite: text("prerequisite").notNull(),
  masteredAt: timestamp("mastered_at").defaultNow().notNull(),
});

export const insertUserMasteredPrerequisitesSchema = z.object({
  userId: z.string().optional().nullable(),
  implementationId: z.number(),
  prerequisite: z.string(),
});

export type InsertUserMasteredPrerequisites = z.infer<typeof insertUserMasteredPrerequisitesSchema>;
export type UserMasteredPrerequisites = typeof userMasteredPrerequisites.$inferSelect;

// ============================================================
// USER SETTINGS
// ============================================================
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  enableConceptCountGeneration: boolean("enable_concept_count_generation").default(true).notNull(),
  enableDailyGeneration: boolean("enable_daily_generation").default(true).notNull(),
  conceptCountThreshold: integer("concept_count_threshold").default(3).notNull(),
  dailyGenerationFrequencyDays: integer("daily_generation_frequency_days").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingsSchema = z.object({
  userId: z.string().optional().nullable(),
  enableConceptCountGeneration: z.boolean().optional(),
  enableDailyGeneration: z.boolean().optional(),
  conceptCountThreshold: z.number().optional(),
  dailyGenerationFrequencyDays: z.number().optional(),
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ============================================================
// USER PERSONALIZATION
// ============================================================
export const userPersonalization = pgTable("user_personalization", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  careerGoals: jsonb("career_goals").$type<string[]>().default([]),
  currentCareer: text("current_career"),
  aspiringCareer: text("aspiring_career"),
  desiredRole: text("desired_role"),
  targetIndustry: text("target_industry"),
  yearsOfExperience: integer("years_of_experience"),
  skillsFocus: jsonb("skills_focus").$type<string[]>().default([]),
  preferredVoice: text("preferred_voice").default("").notNull(),
  theme: text("theme").default("system").notNull(),
  location: text("location"),
  locationLastUpdated: timestamp("location_last_updated"),
  projectPreferences: jsonb("project_preferences").$type<{
    preferredComplexity?: "beginner" | "intermediate" | "advanced";
    preferredApproach?: "simulation" | "code" | "theory" | "mixed";
    preferredTools?: string[];
    topicLean?: string;
    additionalNotes?: string;
    confidenceLevel?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPersonalizationSchema = z.object({
  userId: z.string().optional().nullable(),
  careerGoals: z.array(z.string()).optional().nullable(),
  currentCareer: z.string().optional().nullable(),
  aspiringCareer: z.string().optional().nullable(),
  desiredRole: z.string().optional().nullable(),
  targetIndustry: z.string().optional().nullable(),
  yearsOfExperience: z.number().optional().nullable(),
  skillsFocus: z.array(z.string()).optional().nullable(),
  preferredVoice: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  locationLastUpdated: z.date().optional().nullable(),
  projectPreferences: z.object({
    preferredComplexity: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    preferredApproach: z.enum(["simulation", "code", "theory", "mixed"]).optional(),
    preferredTools: z.array(z.string()).optional(),
    topicLean: z.string().optional(),
    additionalNotes: z.string().optional(),
    confidenceLevel: z.number().optional(),
  }).optional().nullable(),
});

export type InsertUserPersonalization = z.infer<typeof insertUserPersonalizationSchema>;
export type UserPersonalization = typeof userPersonalization.$inferSelect;

// ============================================================
// IDEA SESSIONS
// ============================================================
export const ideaSessions = pgTable("idea_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull().default("New Idea"),
  messages: jsonb("messages").$type<{ role: string; content: string }[]>().default([]),
  ideaSummary: text("idea_summary"),
  analysis: jsonb("analysis"),
  status: text("status").notNull().default("chatting"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIdeaSessionSchema = z.object({
  userId: z.string().optional().nullable(),
  title: z.string().optional(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })).optional().nullable(),
  ideaSummary: z.string().optional().nullable(),
  analysis: z.any().optional().nullable(),
  status: z.string().optional(),
  projectId: z.number().optional().nullable(),
});

export type InsertIdeaSession = z.infer<typeof insertIdeaSessionSchema>;
export type IdeaSession = typeof ideaSessions.$inferSelect;
