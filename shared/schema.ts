import { pgTable, text, serial, timestamp, jsonb, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").unique().notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  avatarUrl: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  avatarData?: string | null;
  createdAt: Date | string;
};

export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
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

export const insertConceptSchema = createInsertSchema(concepts).omit({
  id: true,
  createdAt: true,
  lastAccessedAt: true,
});

export type InsertConcept = z.infer<typeof insertConceptSchema>;
export type Concept = typeof concepts.$inferSelect;

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  conceptId: integer("concept_id"),
  projectId: integer("project_id"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isCollapsed: boolean("is_collapsed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: uuid("user_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
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

export const insertTrendSchema = createInsertSchema(trends).omit({
  id: true,
  publishedAt: true,
});

export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type Trend = typeof trends.$inferSelect;

export const implementations = pgTable("implementations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
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

export const projectFeedback = pgTable("project_feedback", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  implementationId: integer("implementation_id").notNull(),
  difficultyRating: integer("difficulty_rating").notNull(),
  enjoymentRating: integer("enjoyment_rating").notNull(),
  metObjectives: jsonb("met_objectives").$type<string[]>().default([]),
  learntSkills: jsonb("learnt_skills").$type<string[]>().default([]),
  outcomeMatches: boolean("outcome_matches").default(true),
  feedbackText: text("feedback_text"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertProjectFeedbackSchema = createInsertSchema(projectFeedback).omit({
  id: true,
  completedAt: true,
});

export type InsertProjectFeedback = z.infer<typeof insertProjectFeedbackSchema>;
export type ProjectFeedback = typeof projectFeedback.$inferSelect;

export const insertImplementationSchema = createInsertSchema(implementations).omit({
  id: true,
  createdAt: true,
  lastAccessedAt: true,
});

export type InsertImplementation = z.infer<typeof insertImplementationSchema>;
export type Implementation = typeof implementations.$inferSelect;

export const opportunityProjects = pgTable("opportunity_projects", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
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

export const insertOpportunityProjectSchema = createInsertSchema(opportunityProjects).omit({
  id: true,
  createdAt: true,
  lastAccessedAt: true,
});

export type InsertOpportunityProject = z.infer<typeof insertOpportunityProjectSchema>;
export type OpportunityProject = typeof opportunityProjects.$inferSelect;

export const projectInteractions = pgTable("project_interactions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  projectId: integer("project_id").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectInteractionSchema = createInsertSchema(projectInteractions).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectInteraction = z.infer<typeof insertProjectInteractionSchema>;
export type ProjectInteraction = typeof projectInteractions.$inferSelect;

export const generationTracking = pgTable("generation_tracking", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  lastDailyGeneration: timestamp("last_daily_generation"),
  conceptCountSinceLastGeneration: integer("concept_count_since_last_generation").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGenerationTrackingSchema = createInsertSchema(generationTracking).omit({
  id: true,
  updatedAt: true,
});

export type InsertGenerationTracking = z.infer<typeof insertGenerationTrackingSchema>;
export type GenerationTracking = typeof generationTracking.$inferSelect;

export const learnerProfiles = pgTable("learner_profiles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  profile: text("profile").notNull(),
  conceptsIncluded: jsonb("concepts_included").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLearnerProfileSchema = createInsertSchema(learnerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;

export const userClaimedKnowledge = pgTable("user_claimed_knowledge", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  conceptId: integer("concept_id").notNull(),
  source: text("source").notNull().default("other"),
  proficiencyLevel: text("proficiency_level").notNull().default("intermediate"),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
});

export const insertUserClaimedKnowledgeSchema = createInsertSchema(userClaimedKnowledge).omit({
  id: true,
  claimedAt: true,
});

export type InsertUserClaimedKnowledge = z.infer<typeof insertUserClaimedKnowledgeSchema>;
export type UserClaimedKnowledge = typeof userClaimedKnowledge.$inferSelect;

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
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

export const userMasteredPrerequisites = pgTable("user_mastered_prerequisites", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  implementationId: integer("implementation_id").notNull(),
  prerequisite: text("prerequisite").notNull(),
  masteredAt: timestamp("mastered_at").defaultNow().notNull(),
});

export const insertUserMasteredPrerequisitesSchema = createInsertSchema(userMasteredPrerequisites).omit({
  id: true,
  masteredAt: true,
});

export type InsertUserMasteredPrerequisites = z.infer<typeof insertUserMasteredPrerequisitesSchema>;
export type UserMasteredPrerequisites = typeof userMasteredPrerequisites.$inferSelect;

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  fetchedAt: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
  enableConceptCountGeneration: boolean("enable_concept_count_generation").default(true).notNull(),
  enableDailyGeneration: boolean("enable_daily_generation").default(true).notNull(),
  conceptCountThreshold: integer("concept_count_threshold").default(3).notNull(),
  dailyGenerationFrequencyDays: integer("daily_generation_frequency_days").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export const userPersonalization = pgTable("user_personalization", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"),
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
  projectPreferences: jsonb("project_preferences").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPersonalizationSchema = createInsertSchema(userPersonalization).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPersonalization = z.infer<typeof insertUserPersonalizationSchema>;
export type UserPersonalization = typeof userPersonalization.$inferSelect;

export type ConnectTopicOrigin = "learner" | "ai-inferred";

export type ConnectTopicContribution = {
  topic: string;
  origin: ConnectTopicOrigin;
  role: string;
};

export type ConnectApplication = {
  id: string;
  title: string;
  summary: string;
  relevantTopics: string[];
};

export type ConnectSystemOverview = {
  summary: string;
  systems: Array<{
    title: string;
    summary: string;
    topicContributions: ConnectTopicContribution[];
  }>;
  applications: ConnectApplication[];
};

export type ConnectUseAssessment = {
  fitLevel: "strong" | "partial" | "weak";
  reasoning: string;
  relevantConcepts: ConnectTopicContribution[];
  applications: ConnectApplication[];
};

export type ConnectBiggerPicture = {
  title: string;
  overview: string;
  topicContributions: ConnectTopicContribution[];
  systemFlow: Array<{
    step: number;
    title: string;
    description: string;
    topics: string[];
  }>;
  endToEndExample: {
    title: string;
    steps: string[];
  };
};

export const connectCourses = pgTable("connect_courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  career: text("career").notNull(),
  program: text("program").notNull(),
  courseName: text("course_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConnectCourse = typeof connectCourses.$inferSelect;
export type ConnectCourseWithTopics = ConnectCourse & {
  topics: ConnectCourseTopic[];
};

export const connectCourseTopics = pgTable("connect_course_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  courseId: uuid("course_id").notNull(),
  topic: text("topic").notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConnectCourseTopic = typeof connectCourseTopics.$inferSelect;

export const connectLearningMaps = pgTable("connect_learning_maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  courseId: uuid("course_id").notNull(),
  entryPath: text("entry_path").notNull(),
  knownUse: text("known_use"),
  useAssessment: jsonb("use_assessment").$type<ConnectUseAssessment | null>(),
  overview: jsonb("overview").$type<ConnectSystemOverview | null>(),
  selectedApplication: jsonb("selected_application").$type<ConnectApplication | null>(),
  biggerPicture: jsonb("bigger_picture").$type<ConnectBiggerPicture | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConnectLearningMap = typeof connectLearningMaps.$inferSelect;
export type ConnectMapSummary = ConnectLearningMap & {
  course: Pick<ConnectCourse, "id" | "career" | "program" | "courseName">;
  researchRoundCount: number;
  findingCount: number;
};

export const connectResearchRounds = pgTable("connect_research_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  mapId: uuid("map_id").notNull(),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConnectResearchRound = typeof connectResearchRounds.$inferSelect;

export const connectResearchFindings = pgTable("connect_research_findings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  mapId: uuid("map_id").notNull(),
  roundId: uuid("round_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  sourceExcerpt: text("source_excerpt"),
  retrievedAt: timestamp("retrieved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConnectResearchFinding = typeof connectResearchFindings.$inferSelect;
export type ConnectMapDetail = ConnectLearningMap & {
  course: ConnectCourseWithTopics;
  researchRounds: ConnectResearchRound[];
  findings: ConnectResearchFinding[];
};

export const connectTopicContributionSchema = z.object({
  topic: z.string().trim().min(1).max(300),
  origin: z.enum(["learner", "ai-inferred"]),
  role: z.string().trim().min(1).max(700),
});

export const connectGeneratedApplicationSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(1000),
  relevantTopics: z.array(z.string().trim().min(1).max(300)).max(20),
});

export const connectSystemOverviewSchema = z.object({
  summary: z.string().trim().min(1).max(3000),
  systems: z.array(z.object({
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(1000),
    topicContributions: z.array(connectTopicContributionSchema).max(30),
  })).max(8),
  applications: z.array(connectGeneratedApplicationSchema).min(1).max(8),
});

export const connectUseAssessmentSchema = z.object({
  fitLevel: z.enum(["strong", "partial", "weak"]),
  reasoning: z.string().trim().min(1).max(3000),
  relevantConcepts: z.array(connectTopicContributionSchema).max(40),
  applications: z.array(connectGeneratedApplicationSchema).min(1).max(8),
});

export const connectBiggerPictureSchema = z.object({
  title: z.string().trim().min(1).max(180),
  overview: z.string().trim().min(1).max(3000),
  topicContributions: z.array(connectTopicContributionSchema).max(40),
  systemFlow: z.array(z.object({
    step: z.number().int().min(1).max(20),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(1000),
    topics: z.array(z.string().trim().min(1).max(300)).max(20),
  })).min(1).max(12),
  endToEndExample: z.object({
    title: z.string().trim().min(1).max(180),
    steps: z.array(z.string().trim().min(1).max(1000)).min(1).max(12),
  }),
});

export const connectResearchSummarySchema = z.object({
  findings: z.array(z.object({
    title: z.string().trim().min(1).max(240),
    summary: z.string().trim().min(1).max(1800),
    sourceUrl: z.string().url().max(2000),
    sourceName: z.string().trim().min(1).max(120),
  })).max(12),
});

export const connectCourseInputSchema = z.object({
  id: z.string().uuid().optional(),
  career: z.string().trim().min(1).max(160),
  program: z.string().trim().min(1).max(180),
  courseName: z.string().trim().min(1).max(180),
  topics: z.array(z.string().trim().min(1).max(300)).max(80).default([]),
});

export const connectMapInputSchema = z.object({
  courseId: z.string().uuid(),
  entryPath: z.enum(["topics", "known_use"]),
  knownUse: z.string().trim().min(1).max(1000).optional(),
}).superRefine((value, context) => {
  if (value.entryPath === "known_use" && !value.knownUse) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["knownUse"],
      message: "Describe the use you have in mind.",
    });
  }
});

export const connectKnownUseSchema = z.object({
  description: z.string().trim().min(1).max(1000),
});

export const connectApplicationSelectionSchema = z.object({
  applicationId: z.string().uuid(),
});

export const connectResearchInputSchema = z.object({
  query: z.string().trim().max(240).optional(),
});
