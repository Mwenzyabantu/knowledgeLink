import session from "express-session";
import createMemoryStore from "memorystore";
import { supabaseAdmin } from "./db";
import type {
  User,
  InsertUser,
  Concept,
  InsertConcept,
  ChatSession,
  InsertChatSession,
  ChatMessage,
  InsertChatMessage,
  Implementation,
  InsertImplementation,
  Trend,
  InsertTrend,
  OpportunityProject,
  InsertOpportunityProject,
  ProjectInteraction,
  InsertProjectInteraction,
  GenerationTracking,
  InsertGenerationTracking,
  LearnerProfile,
  InsertLearnerProfile,
  UserClaimedKnowledge,
  InsertUserClaimedKnowledge,
  Resource,
  InsertResource,
  UserSettings,
  InsertUserSettings,
  UserMasteredPrerequisites,
  InsertUserMasteredPrerequisites,
  UserPersonalization,
  InsertUserPersonalization,
  ProjectFeedback,
  InsertProjectFeedback,
  IdeaSession,
  InsertIdeaSession,
} from "@shared/schema";

// ============================================================
// Row converters: Supabase snake_case → TypeScript camelCase
// ============================================================

function toUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url ?? null,
    createdAt: new Date(row.created_at),
  };
}

function toConcept(row: any): Concept {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    originalInput: row.original_input ?? null,
    title: row.title,
    category: row.category,
    problem: row.problem,
    what: row.what,
    why: row.why,
    how: row.how,
    where: row.where_applications ?? [],
    who: row.who,
    when: row.when_context,
    pseudocode: row.pseudocode ?? null,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite ?? false,
    prerequisites: row.prerequisites ?? { essential: [], helpful: [], optional: [] },
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at),
  };
}

function toChatSession(row: any): ChatSession {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    type: row.type,
    conceptId: row.concept_id ?? null,
    projectId: row.project_id ?? null,
    tags: row.tags ?? [],
    isCollapsed: row.is_collapsed ?? false,
    createdAt: new Date(row.created_at),
    lastMessageAt: new Date(row.last_message_at),
  };
}

function toChatMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id ?? null,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

function toTrend(row: any): Trend {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url ?? null,
    imageDescription: row.image_description ?? null,
    source: row.source,
    sourceUrl: row.source_url ?? null,
    relevanceToUser: row.relevance_to_user,
    relatedConcepts: row.related_concepts ?? [],
    category: row.category,
    publishedAt: new Date(row.published_at),
    readByUser: row.read_by_user ?? false,
    userRating: row.user_rating ?? null,
  };
}

function toImplementation(row: any): Implementation {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id,
    chatHistoryId: row.chat_history_id ?? null,
    projectName: row.project_name,
    type: row.type,
    tool: row.tool,
    language: row.language,
    imageUrl: row.image_url ?? null,
    components: row.components ?? [],
    learningGoals: row.learning_goals ?? [],
    expectedOutcomes: row.expected_outcomes ?? [],
    requiredArtifacts: row.required_artifacts ?? [],
    problemAddressed: row.problem_addressed ?? null,
    whySuggested: row.why_suggested ?? null,
    realWorldContext: row.real_world_context ?? null,
    industry: row.industry ?? null,
    code: row.code ?? null,
    pseudocode: row.pseudocode ?? null,
    flowDiagram: row.flow_diagram ?? null,
    instructions: row.instructions ?? null,
    status: row.status,
    version: row.version,
    previousVersionId: row.previous_version_id ?? null,
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at),
  };
}

function toProjectFeedback(row: any): ProjectFeedback {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    implementationId: row.implementation_id,
    difficultyRating: row.difficulty_rating,
    enjoymentRating: row.enjoyment_rating,
    metObjectives: row.met_objectives ?? [],
    learntSkills: row.learnt_skills ?? [],
    outcomeMatches: row.outcome_matches ?? true,
    feedbackText: row.feedback_text ?? null,
    completedAt: new Date(row.completed_at),
  };
}

function toOpportunityProject(row: any): OpportunityProject {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty,
    estimatedHours: row.estimated_hours,
    skills: row.skills ?? [],
    relatedConceptIds: row.related_concept_ids ?? [],
    recommendedImplementationId: row.recommended_implementation_id ?? null,
    locationContext: row.location_context ?? null,
    problemType: row.problem_type ?? "everyday",
    createdAt: new Date(row.created_at),
    lastAccessedAt: new Date(row.last_accessed_at),
  };
}

function toProjectInteraction(row: any): ProjectInteraction {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    projectId: row.project_id,
    action: row.action,
    createdAt: new Date(row.created_at),
  };
}

function toGenerationTracking(row: any): GenerationTracking {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    lastDailyGeneration: row.last_daily_generation
      ? new Date(row.last_daily_generation)
      : null,
    conceptCountSinceLastGeneration: row.concept_count_since_last_generation,
    updatedAt: new Date(row.updated_at),
  };
}

function toLearnerProfile(row: any): LearnerProfile {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    profile: row.profile,
    conceptsIncluded: row.concepts_included ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toUserClaimedKnowledge(row: any): UserClaimedKnowledge {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id,
    source: row.source,
    proficiencyLevel: row.proficiency_level,
    claimedAt: new Date(row.claimed_at),
  };
}

function toResource(row: any): Resource {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    conceptId: row.concept_id ?? null,
    projectId: row.project_id ?? null,
    title: row.title,
    url: row.url,
    type: row.type,
    source: row.source,
    description: row.description ?? null,
    relevanceScore: row.relevance_score ?? 50,
    prerequisite: row.prerequisite ?? null,
    fetchedAt: new Date(row.fetched_at),
  };
}

function toUserSettings(row: any): UserSettings {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    enableConceptCountGeneration: row.enable_concept_count_generation,
    enableDailyGeneration: row.enable_daily_generation,
    conceptCountThreshold: row.concept_count_threshold,
    dailyGenerationFrequencyDays: row.daily_generation_frequency_days,
    updatedAt: new Date(row.updated_at),
  };
}

function toUserMasteredPrerequisites(row: any): UserMasteredPrerequisites {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    implementationId: row.implementation_id,
    prerequisite: row.prerequisite,
    masteredAt: new Date(row.mastered_at),
  };
}

function toUserPersonalization(row: any): UserPersonalization {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    careerGoals: row.career_goals ?? [],
    currentCareer: row.current_career ?? null,
    aspiringCareer: row.aspiring_career ?? null,
    desiredRole: row.desired_role ?? null,
    targetIndustry: row.target_industry ?? null,
    yearsOfExperience: row.years_of_experience ?? null,
    skillsFocus: row.skills_focus ?? [],
    preferredVoice: row.preferred_voice ?? "",
    theme: row.theme ?? "system",
    location: row.location ?? null,
    locationLastUpdated: row.location_last_updated
      ? new Date(row.location_last_updated)
      : null,
    projectPreferences: row.project_preferences ?? {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toIdeaSession(row: any): IdeaSession {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    messages: row.messages ?? [],
    ideaSummary: row.idea_summary ?? null,
    analysis: row.analysis ?? null,
    status: row.status,
    projectId: row.project_id ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================
// IStorage Interface
// ============================================================

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // Concepts
  getConcepts(userId?: string): Promise<Concept[]>;
  getConceptById(id: number): Promise<Concept | undefined>;
  createConcept(concept: InsertConcept): Promise<Concept>;
  updateConcept(id: number, concept: Partial<InsertConcept>): Promise<Concept | undefined>;
  deleteConcept(id: number): Promise<boolean>;

  // Chat Sessions
  getChatSessions(userId?: string): Promise<ChatSession[]>;
  getChatSessionById(id: number, userId?: string): Promise<ChatSession | undefined>;
  getChatSessionByConceptId(conceptId: number): Promise<ChatSession | undefined>;
  getChatSessionByProjectId(projectId: number): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  deleteChatSession(id: number): Promise<boolean>;

  // Chat Messages
  getChatMessagesBySessionId(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Implementations
  getImplementations(userId?: string): Promise<Implementation[]>;
  getImplementationById(id: number, userId?: string): Promise<Implementation | undefined>;
  getImplementationsByConceptId(conceptId: number): Promise<Implementation[]>;
  getSimilarImplementations(type: string, tool: string, language: string, limit?: number): Promise<Implementation[]>;
  createImplementation(implementation: InsertImplementation): Promise<Implementation>;
  updateImplementation(id: number, implementation: Partial<InsertImplementation>): Promise<Implementation | undefined>;
  deleteImplementation(id: number): Promise<boolean>;

  // Project Feedback
  createProjectFeedback(feedback: InsertProjectFeedback): Promise<ProjectFeedback>;
  getProjectFeedbackByImplementationId(implementationId: number): Promise<ProjectFeedback | undefined>;
  getProjectFeedbackByUser(userId: string): Promise<ProjectFeedback[]>;

  // Trends
  getTrends(userId?: string): Promise<Trend[]>;
  getTrendById(id: number, userId?: string): Promise<Trend | undefined>;
  getTrendsByCategory(category: string): Promise<Trend[]>;
  createTrend(trend: InsertTrend): Promise<Trend>;
  updateTrend(id: number, trend: Partial<InsertTrend>): Promise<Trend | undefined>;
  deleteTrend(id: number): Promise<boolean>;

  // Opportunity Projects
  getOpportunityProjects(userId?: string): Promise<OpportunityProject[]>;
  getOpportunityProjectById(id: number, userId?: string): Promise<OpportunityProject | undefined>;
  createOpportunityProject(project: InsertOpportunityProject): Promise<OpportunityProject>;
  updateOpportunityProject(id: number, project: Partial<InsertOpportunityProject>): Promise<OpportunityProject | undefined>;
  deleteOpportunityProject(id: number): Promise<boolean>;

  // Project Interactions
  createProjectInteraction(interaction: InsertProjectInteraction): Promise<ProjectInteraction>;
  getProjectInteractions(): Promise<ProjectInteraction[]>;
  getProjectInteractionsByProjectId(projectId: number): Promise<ProjectInteraction[]>;

  // Generation Tracking
  getGenerationTracking(userId: string): Promise<GenerationTracking | undefined>;
  createGenerationTracking(tracking: InsertGenerationTracking): Promise<GenerationTracking>;
  updateGenerationTracking(id: number, tracking: Partial<InsertGenerationTracking>): Promise<GenerationTracking | undefined>;

  // Learner Profiles
  getLatestLearnerProfile(userId: string): Promise<LearnerProfile | undefined>;
  createLearnerProfile(profile: InsertLearnerProfile): Promise<LearnerProfile>;

  // User Claimed Knowledge
  getUserClaimedKnowledge(userId: string): Promise<UserClaimedKnowledge[]>;
  createUserClaimedKnowledge(knowledge: InsertUserClaimedKnowledge): Promise<UserClaimedKnowledge>;

  // Resources
  getResources(): Promise<Resource[]>;
  getResourcesByConceptId(conceptId: number): Promise<Resource[]>;
  getResourcesByProjectId(projectId: number): Promise<Resource[]>;
  getResourcesByPrerequisite(userId: string, prerequisite: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  createMultipleResources(resources: InsertResource[]): Promise<Resource[]>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(id: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;

  // User Mastered Prerequisites
  getUserMasteredPrerequisites(userId: string): Promise<UserMasteredPrerequisites[]>;
  getMasteredPrerequisitesByImplementation(implementationId: number): Promise<UserMasteredPrerequisites[]>;
  getMasteredPrerequisitesByName(userId: string, name: string): Promise<UserMasteredPrerequisites[]>;
  saveMasteredPrerequisites(prerequisites: InsertUserMasteredPrerequisites[]): Promise<UserMasteredPrerequisites[]>;

  // Project Versions
  getProjectVersions(rootId: number): Promise<Implementation[]>;
  getLatestVersion(rootId: number): Promise<Implementation | undefined>;

  // User Personalization
  getUserPersonalization(userId: string): Promise<UserPersonalization | undefined>;
  createUserPersonalization(personalization: InsertUserPersonalization): Promise<UserPersonalization>;
  updateUserPersonalization(id: number, personalization: Partial<InsertUserPersonalization>): Promise<UserPersonalization | undefined>;

  // Idea Sessions
  getIdeaSessions(userId: string): Promise<IdeaSession[]>;
  getIdeaSessionById(id: number, userId: string): Promise<IdeaSession | undefined>;
  createIdeaSession(session: InsertIdeaSession): Promise<IdeaSession>;
  updateIdeaSession(id: number, session: Partial<InsertIdeaSession>): Promise<IdeaSession | undefined>;
  deleteIdeaSession(id: number): Promise<boolean>;

  // Data Deletion
  clearAllChatHistory(userId: string): Promise<number>;
  clearAllProjects(userId: string): Promise<number>;
  deleteConceptsWithProjects(conceptIds: number[]): Promise<number>;
  deleteAllData(userId: string): Promise<{ concepts: number; implementations: number; sessions: number; messages: number }>;

  sessionStore: session.Store;
}

// ============================================================
// DbStorage — Supabase implementation
// ============================================================

export class DbStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  // ── Users ───────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select()
        .eq("id", id)
        .maybeSingle();
      return data ? toUser(data) : undefined;
    } catch {
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select()
        .eq("username", username)
        .maybeSingle();
      return data ? toUser(data) : undefined;
    } catch {
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select()
        .eq("email", email)
        .maybeSingle();
      return data ? toUser(data) : undefined;
    } catch {
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: insertUser.id,
          username: insertUser.username,
          email: insertUser.email,
          avatar_url: insertUser.avatarUrl ?? null,
        },
        { onConflict: "id" }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toUser(data);
  }

  async deleteUser(id: string): Promise<boolean> {
    // Delete all related data (CASCADE from profiles handles some, but we clean explicitly)
    const tables = [
      "opportunity_projects",
      "trends",
      "user_settings",
      "user_personalization",
      "generation_tracking",
      "learner_profiles",
      "user_claimed_knowledge",
      "user_mastered_prerequisites",
      "project_feedback",
      "project_interactions",
      "resources",
      "chat_messages",
      "chat_sessions",
      "idea_sessions",
      "implementations",
      "concepts",
    ];
    for (const table of tables) {
      await supabaseAdmin.from(table).delete().eq("user_id", id);
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);
    // Also remove from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(id).catch(() => {});
    return !error;
  }

  // ── Concepts ────────────────────────────────────────────────

  async getConcepts(userId?: string): Promise<Concept[]> {
    try {
      let query = supabaseAdmin
        .from("concepts")
        .select()
        .order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      return (data ?? []).map(toConcept);
    } catch {
      return [];
    }
  }

  async getConceptById(id: number): Promise<Concept | undefined> {
    const { data } = await supabaseAdmin
      .from("concepts")
      .select()
      .eq("id", id)
      .maybeSingle();
    return data ? toConcept(data) : undefined;
  }

  async createConcept(concept: InsertConcept): Promise<Concept> {
    const { data, error } = await supabaseAdmin
      .from("concepts")
      .insert({
        user_id: concept.userId ?? null,
        original_input: concept.originalInput ?? null,
        title: concept.title,
        category: concept.category,
        problem: concept.problem,
        what: concept.what,
        why: concept.why,
        how: concept.how,
        where_applications: concept.where ?? [],
        who: concept.who,
        when_context: concept.when,
        pseudocode: concept.pseudocode ?? null,
        tags: concept.tags ?? [],
        is_favorite: concept.isFavorite ?? false,
        prerequisites: concept.prerequisites ?? {
          essential: [],
          helpful: [],
          optional: [],
        },
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toConcept(data);
  }

  async updateConcept(
    id: number,
    updates: Partial<InsertConcept>
  ): Promise<Concept | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.originalInput !== undefined)
      dbUpdates.original_input = updates.originalInput;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.problem !== undefined) dbUpdates.problem = updates.problem;
    if (updates.what !== undefined) dbUpdates.what = updates.what;
    if (updates.why !== undefined) dbUpdates.why = updates.why;
    if (updates.how !== undefined) dbUpdates.how = updates.how;
    if (updates.where !== undefined)
      dbUpdates.where_applications = updates.where;
    if (updates.who !== undefined) dbUpdates.who = updates.who;
    if (updates.when !== undefined) dbUpdates.when_context = updates.when;
    if (updates.pseudocode !== undefined)
      dbUpdates.pseudocode = updates.pseudocode;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.isFavorite !== undefined)
      dbUpdates.is_favorite = updates.isFavorite;
    if (updates.prerequisites !== undefined)
      dbUpdates.prerequisites = updates.prerequisites;
    if ((updates as any).lastAccessedAt !== undefined)
      dbUpdates.last_accessed_at = (updates as any).lastAccessedAt;

    const { data } = await supabaseAdmin
      .from("concepts")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toConcept(data) : undefined;
  }

  async deleteConcept(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("concepts")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Chat Sessions ────────────────────────────────────────────

  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    let query = supabaseAdmin
      .from("chat_sessions")
      .select()
      .order("last_message_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toChatSession);
  }

  async getChatSessionById(
    id: number,
    userId?: string
  ): Promise<ChatSession | undefined> {
    let query = supabaseAdmin
      .from("chat_sessions")
      .select()
      .eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toChatSession(data) : undefined;
  }

  async getChatSessionByConceptId(
    conceptId: number
  ): Promise<ChatSession | undefined> {
    const { data } = await supabaseAdmin
      .from("chat_sessions")
      .select()
      .eq("concept_id", conceptId)
      .maybeSingle();
    return data ? toChatSession(data) : undefined;
  }

  async getChatSessionByProjectId(
    projectId: number
  ): Promise<ChatSession | undefined> {
    const { data } = await supabaseAdmin
      .from("chat_sessions")
      .select()
      .eq("project_id", projectId)
      .maybeSingle();
    return data ? toChatSession(data) : undefined;
  }

  async createChatSession(
    insertSession: InsertChatSession
  ): Promise<ChatSession> {
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        user_id: insertSession.userId ?? null,
        type: insertSession.type,
        concept_id: insertSession.conceptId ?? null,
        project_id: insertSession.projectId ?? null,
        tags: insertSession.tags ?? [],
        is_collapsed: insertSession.isCollapsed ?? false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toChatSession(data);
  }

  async updateChatSession(
    id: number,
    updates: Partial<InsertChatSession>
  ): Promise<ChatSession | undefined> {
    const dbUpdates: Record<string, any> = {
      last_message_at: new Date().toISOString(),
    };
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.conceptId !== undefined)
      dbUpdates.concept_id = updates.conceptId;
    if (updates.projectId !== undefined)
      dbUpdates.project_id = updates.projectId;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.isCollapsed !== undefined)
      dbUpdates.is_collapsed = updates.isCollapsed;

    const { data } = await supabaseAdmin
      .from("chat_sessions")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toChatSession(data) : undefined;
  }

  async deleteChatSession(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Chat Messages ────────────────────────────────────────────

  async getChatMessagesBySessionId(sessionId: number): Promise<ChatMessage[]> {
    const { data } = await supabaseAdmin
      .from("chat_messages")
      .select()
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    return (data ?? []).map(toChatMessage);
  }

  async createChatMessage(
    insertMessage: InsertChatMessage
  ): Promise<ChatMessage> {
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        session_id: insertMessage.sessionId,
        user_id: insertMessage.userId ?? null,
        role: insertMessage.role,
        content: insertMessage.content,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Update session's last_message_at
    await supabaseAdmin
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", insertMessage.sessionId);
    return toChatMessage(data);
  }

  // ── Implementations ──────────────────────────────────────────

  async getImplementations(userId?: string): Promise<Implementation[]> {
    try {
      let query = supabaseAdmin
        .from("implementations")
        .select()
        .order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      return (data ?? []).map(toImplementation);
    } catch {
      return [];
    }
  }

  async getImplementationById(
    id: number,
    userId?: string
  ): Promise<Implementation | undefined> {
    let query = supabaseAdmin
      .from("implementations")
      .select()
      .eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toImplementation(data) : undefined;
  }

  async getImplementationsByConceptId(
    conceptId: number
  ): Promise<Implementation[]> {
    const { data } = await supabaseAdmin
      .from("implementations")
      .select()
      .eq("concept_id", conceptId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(toImplementation);
  }

  async getSimilarImplementations(
    type: string,
    tool: string,
    language: string,
    limit = 3
  ): Promise<Implementation[]> {
    const { data } = await supabaseAdmin
      .from("implementations")
      .select()
      .order("created_at", { ascending: false });
    const all = (data ?? []).map(toImplementation);
    const withInstructions = all.filter(
      (impl) => impl.instructions && impl.instructions.trim().length > 0
    );
    const scored = withInstructions.map((impl) => {
      let score = 0;
      if (impl.type?.toLowerCase() === type.toLowerCase()) score += 3;
      if (impl.tool?.toLowerCase() === tool.toLowerCase()) score += 2;
      if (impl.language?.toLowerCase() === language.toLowerCase()) score += 2;
      return { impl, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.impl);
  }

  async createImplementation(
    insertImpl: InsertImplementation
  ): Promise<Implementation> {
    const { data, error } = await supabaseAdmin
      .from("implementations")
      .insert({
        user_id: insertImpl.userId ?? null,
        concept_id: insertImpl.conceptId,
        chat_history_id: insertImpl.chatHistoryId ?? null,
        project_name: insertImpl.projectName,
        type: insertImpl.type,
        tool: insertImpl.tool,
        language: insertImpl.language,
        image_url: insertImpl.imageUrl ?? null,
        components: insertImpl.components ?? [],
        learning_goals: insertImpl.learningGoals ?? [],
        expected_outcomes: insertImpl.expectedOutcomes ?? [],
        required_artifacts: insertImpl.requiredArtifacts ?? [],
        problem_addressed: insertImpl.problemAddressed ?? null,
        why_suggested: insertImpl.whySuggested ?? null,
        real_world_context: insertImpl.realWorldContext ?? null,
        industry: insertImpl.industry ?? null,
        code: insertImpl.code ?? null,
        pseudocode: insertImpl.pseudocode ?? null,
        flow_diagram: insertImpl.flowDiagram ?? null,
        instructions: insertImpl.instructions ?? null,
        status: insertImpl.status ?? "preview",
        version: insertImpl.version ?? 1,
        previous_version_id: insertImpl.previousVersionId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toImplementation(data);
  }

  async updateImplementation(
    id: number,
    updates: Partial<InsertImplementation>
  ): Promise<Implementation | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.projectName !== undefined)
      dbUpdates.project_name = updates.projectName;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.tool !== undefined) dbUpdates.tool = updates.tool;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.components !== undefined)
      dbUpdates.components = updates.components;
    if (updates.learningGoals !== undefined)
      dbUpdates.learning_goals = updates.learningGoals;
    if (updates.expectedOutcomes !== undefined)
      dbUpdates.expected_outcomes = updates.expectedOutcomes;
    if (updates.requiredArtifacts !== undefined)
      dbUpdates.required_artifacts = updates.requiredArtifacts;
    if (updates.problemAddressed !== undefined)
      dbUpdates.problem_addressed = updates.problemAddressed;
    if (updates.whySuggested !== undefined)
      dbUpdates.why_suggested = updates.whySuggested;
    if (updates.realWorldContext !== undefined)
      dbUpdates.real_world_context = updates.realWorldContext;
    if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
    if (updates.code !== undefined) dbUpdates.code = updates.code;
    if (updates.pseudocode !== undefined)
      dbUpdates.pseudocode = updates.pseudocode;
    if (updates.flowDiagram !== undefined)
      dbUpdates.flow_diagram = updates.flowDiagram;
    if (updates.instructions !== undefined)
      dbUpdates.instructions = updates.instructions;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.version !== undefined) dbUpdates.version = updates.version;
    if (updates.previousVersionId !== undefined)
      dbUpdates.previous_version_id = updates.previousVersionId;
    if ((updates as any).lastAccessedAt !== undefined)
      dbUpdates.last_accessed_at = (updates as any).lastAccessedAt;
    if (updates.chatHistoryId !== undefined)
      dbUpdates.chat_history_id = updates.chatHistoryId;

    const { data } = await supabaseAdmin
      .from("implementations")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toImplementation(data) : undefined;
  }

  async deleteImplementation(id: number): Promise<boolean> {
    const impl = await this.getImplementationById(id);
    if (impl && impl.conceptId) {
      const others = await this.getImplementationsByConceptId(impl.conceptId);
      if (others.length <= 1) {
        await this.deleteConceptsWithProjects([impl.conceptId]);
        return true;
      }
    }
    const { error } = await supabaseAdmin
      .from("implementations")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Project Feedback ─────────────────────────────────────────

  async createProjectFeedback(
    feedback: InsertProjectFeedback
  ): Promise<ProjectFeedback> {
    const { data, error } = await supabaseAdmin
      .from("project_feedback")
      .insert({
        user_id: feedback.userId ?? null,
        implementation_id: feedback.implementationId,
        difficulty_rating: feedback.difficultyRating,
        enjoyment_rating: feedback.enjoymentRating,
        met_objectives: feedback.metObjectives ?? [],
        learnt_skills: feedback.learntSkills ?? [],
        outcome_matches: feedback.outcomeMatches ?? true,
        feedback_text: feedback.feedbackText ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toProjectFeedback(data);
  }

  async getProjectFeedbackByImplementationId(
    implementationId: number
  ): Promise<ProjectFeedback | undefined> {
    const { data } = await supabaseAdmin
      .from("project_feedback")
      .select()
      .eq("implementation_id", implementationId)
      .maybeSingle();
    return data ? toProjectFeedback(data) : undefined;
  }

  async getProjectFeedbackByUser(userId: string): Promise<ProjectFeedback[]> {
    const { data } = await supabaseAdmin
      .from("project_feedback")
      .select()
      .eq("user_id", userId);
    return (data ?? []).map(toProjectFeedback);
  }

  // ── Trends ───────────────────────────────────────────────────

  async getTrends(userId?: string): Promise<Trend[]> {
    let query = supabaseAdmin
      .from("trends")
      .select()
      .order("published_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toTrend);
  }

  async getTrendById(
    id: number,
    userId?: string
  ): Promise<Trend | undefined> {
    let query = supabaseAdmin.from("trends").select().eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toTrend(data) : undefined;
  }

  async getTrendsByCategory(category: string): Promise<Trend[]> {
    const { data } = await supabaseAdmin
      .from("trends")
      .select()
      .eq("category", category)
      .order("published_at", { ascending: false });
    return (data ?? []).map(toTrend);
  }

  async createTrend(insertTrend: InsertTrend): Promise<Trend> {
    const { data, error } = await supabaseAdmin
      .from("trends")
      .insert({
        user_id: insertTrend.userId ?? null,
        title: insertTrend.title,
        content: insertTrend.content,
        image_url: insertTrend.imageUrl ?? null,
        image_description: insertTrend.imageDescription ?? null,
        source: insertTrend.source,
        source_url: insertTrend.sourceUrl ?? null,
        relevance_to_user: insertTrend.relevanceToUser,
        related_concepts: insertTrend.relatedConcepts ?? [],
        category: insertTrend.category,
        read_by_user: insertTrend.readByUser ?? false,
        user_rating: insertTrend.userRating ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toTrend(data);
  }

  async updateTrend(
    id: number,
    updates: Partial<InsertTrend>
  ): Promise<Trend | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.imageDescription !== undefined)
      dbUpdates.image_description = updates.imageDescription;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.sourceUrl !== undefined)
      dbUpdates.source_url = updates.sourceUrl;
    if (updates.relevanceToUser !== undefined)
      dbUpdates.relevance_to_user = updates.relevanceToUser;
    if (updates.relatedConcepts !== undefined)
      dbUpdates.related_concepts = updates.relatedConcepts;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.readByUser !== undefined)
      dbUpdates.read_by_user = updates.readByUser;
    if (updates.userRating !== undefined)
      dbUpdates.user_rating = updates.userRating;

    const { data } = await supabaseAdmin
      .from("trends")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toTrend(data) : undefined;
  }

  async deleteTrend(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("trends")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Opportunity Projects ─────────────────────────────────────

  async getOpportunityProjects(userId?: string): Promise<OpportunityProject[]> {
    let query = supabaseAdmin
      .from("opportunity_projects")
      .select()
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []).map(toOpportunityProject);
  }

  async getOpportunityProjectById(
    id: number,
    userId?: string
  ): Promise<OpportunityProject | undefined> {
    let query = supabaseAdmin
      .from("opportunity_projects")
      .select()
      .eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.maybeSingle();
    return data ? toOpportunityProject(data) : undefined;
  }

  async createOpportunityProject(
    project: InsertOpportunityProject
  ): Promise<OpportunityProject> {
    const { data, error } = await supabaseAdmin
      .from("opportunity_projects")
      .insert({
        user_id: project.userId ?? null,
        title: project.title,
        summary: project.summary,
        difficulty: project.difficulty,
        estimated_hours: project.estimatedHours,
        skills: project.skills ?? [],
        related_concept_ids: project.relatedConceptIds ?? [],
        recommended_implementation_id:
          project.recommendedImplementationId ?? null,
        location_context: project.locationContext ?? null,
        problem_type: project.problemType ?? "everyday",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toOpportunityProject(data);
  }

  async updateOpportunityProject(
    id: number,
    updates: Partial<InsertOpportunityProject>
  ): Promise<OpportunityProject | undefined> {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
    if (updates.difficulty !== undefined)
      dbUpdates.difficulty = updates.difficulty;
    if (updates.estimatedHours !== undefined)
      dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
    if (updates.relatedConceptIds !== undefined)
      dbUpdates.related_concept_ids = updates.relatedConceptIds;
    if (updates.recommendedImplementationId !== undefined)
      dbUpdates.recommended_implementation_id =
        updates.recommendedImplementationId;
    if (updates.locationContext !== undefined)
      dbUpdates.location_context = updates.locationContext;
    if (updates.problemType !== undefined)
      dbUpdates.problem_type = updates.problemType;

    const { data } = await supabaseAdmin
      .from("opportunity_projects")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toOpportunityProject(data) : undefined;
  }

  async deleteOpportunityProject(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("opportunity_projects")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Project Interactions ─────────────────────────────────────

  async createProjectInteraction(
    interaction: InsertProjectInteraction
  ): Promise<ProjectInteraction> {
    const { data, error } = await supabaseAdmin
      .from("project_interactions")
      .insert({
        user_id: interaction.userId ?? null,
        project_id: interaction.projectId,
        action: interaction.action,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toProjectInteraction(data);
  }

  async getProjectInteractions(): Promise<ProjectInteraction[]> {
    const { data } = await supabaseAdmin
      .from("project_interactions")
      .select()
      .order("created_at", { ascending: false });
    return (data ?? []).map(toProjectInteraction);
  }

  async getProjectInteractionsByProjectId(
    projectId: number
  ): Promise<ProjectInteraction[]> {
    const { data } = await supabaseAdmin
      .from("project_interactions")
      .select()
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(toProjectInteraction);
  }

  // ── User Settings ────────────────────────────────────────────

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const { data } = await supabaseAdmin
      .from("user_settings")
      .select()
      .eq("user_id", userId)
      .maybeSingle();
    return data ? toUserSettings(data) : undefined;
  }

  async createUserSettings(
    settings: InsertUserSettings
  ): Promise<UserSettings> {
    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .insert({
        user_id: settings.userId ?? null,
        enable_concept_count_generation:
          settings.enableConceptCountGeneration ?? true,
        enable_daily_generation: settings.enableDailyGeneration ?? true,
        concept_count_threshold: settings.conceptCountThreshold ?? 3,
        daily_generation_frequency_days:
          settings.dailyGenerationFrequencyDays ?? 1,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toUserSettings(data);
  }

  async updateUserSettings(
    id: number,
    updates: Partial<InsertUserSettings>
  ): Promise<UserSettings | undefined> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.enableConceptCountGeneration !== undefined)
      dbUpdates.enable_concept_count_generation =
        updates.enableConceptCountGeneration;
    if (updates.enableDailyGeneration !== undefined)
      dbUpdates.enable_daily_generation = updates.enableDailyGeneration;
    if (updates.conceptCountThreshold !== undefined)
      dbUpdates.concept_count_threshold = updates.conceptCountThreshold;
    if (updates.dailyGenerationFrequencyDays !== undefined)
      dbUpdates.daily_generation_frequency_days =
        updates.dailyGenerationFrequencyDays;

    const { data } = await supabaseAdmin
      .from("user_settings")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toUserSettings(data) : undefined;
  }

  // ── User Mastered Prerequisites ──────────────────────────────

  async getUserMasteredPrerequisites(
    userId: string
  ): Promise<UserMasteredPrerequisites[]> {
    const { data } = await supabaseAdmin
      .from("user_mastered_prerequisites")
      .select()
      .eq("user_id", userId);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }

  async getMasteredPrerequisitesByImplementation(
    implementationId: number
  ): Promise<UserMasteredPrerequisites[]> {
    const { data } = await supabaseAdmin
      .from("user_mastered_prerequisites")
      .select()
      .eq("implementation_id", implementationId);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }

  async getMasteredPrerequisitesByName(
    userId: string,
    name: string
  ): Promise<UserMasteredPrerequisites[]> {
    const { data } = await supabaseAdmin
      .from("user_mastered_prerequisites")
      .select()
      .eq("user_id", userId)
      .eq("prerequisite", name);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }

  async saveMasteredPrerequisites(
    prerequisites: InsertUserMasteredPrerequisites[]
  ): Promise<UserMasteredPrerequisites[]> {
    if (prerequisites.length === 0) return [];
    const rows = prerequisites.map((p) => ({
      user_id: p.userId ?? null,
      implementation_id: p.implementationId,
      prerequisite: p.prerequisite,
    }));
    const { data, error } = await supabaseAdmin
      .from("user_mastered_prerequisites")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toUserMasteredPrerequisites);
  }

  // ── Project Versions ─────────────────────────────────────────

  async getProjectVersions(rootId: number): Promise<Implementation[]> {
    const root = await this.getImplementationById(rootId);
    if (!root) return [];
    const allVersions = await this.getImplementationsByConceptId(root.conceptId);
    const sorted = allVersions.sort((a, b) => b.version - a.version);
    const uniqueTools = new Map<string, Implementation>();
    for (const impl of sorted) {
      if (!uniqueTools.has(impl.tool) && impl.projectName === root.projectName) {
        uniqueTools.set(impl.tool, impl);
      }
    }
    return Array.from(uniqueTools.values());
  }

  async getLatestVersion(rootId: number): Promise<Implementation | undefined> {
    const versions = await this.getProjectVersions(rootId);
    return versions[0];
  }

  // ── User Personalization ─────────────────────────────────────

  async getUserPersonalization(
    userId: string
  ): Promise<UserPersonalization | undefined> {
    try {
      const { data } = await supabaseAdmin
        .from("user_personalization")
        .select()
        .eq("user_id", userId)
        .maybeSingle();
      return data ? toUserPersonalization(data) : undefined;
    } catch {
      return undefined;
    }
  }

  async createUserPersonalization(
    personalization: InsertUserPersonalization
  ): Promise<UserPersonalization> {
    const { data, error } = await supabaseAdmin
      .from("user_personalization")
      .insert({
        user_id: personalization.userId ?? null,
        career_goals: personalization.careerGoals ?? [],
        current_career: personalization.currentCareer ?? null,
        aspiring_career: personalization.aspiringCareer ?? null,
        desired_role: personalization.desiredRole ?? null,
        target_industry: personalization.targetIndustry ?? null,
        years_of_experience: personalization.yearsOfExperience ?? null,
        skills_focus: personalization.skillsFocus ?? [],
        preferred_voice: personalization.preferredVoice ?? "",
        theme: personalization.theme ?? "system",
        location: personalization.location ?? null,
        location_last_updated: personalization.locationLastUpdated ?? null,
        project_preferences: personalization.projectPreferences ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toUserPersonalization(data);
  }

  async updateUserPersonalization(
    id: number,
    updates: Partial<InsertUserPersonalization>
  ): Promise<UserPersonalization | undefined> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.careerGoals !== undefined)
      dbUpdates.career_goals = updates.careerGoals;
    if (updates.currentCareer !== undefined)
      dbUpdates.current_career = updates.currentCareer;
    if (updates.aspiringCareer !== undefined)
      dbUpdates.aspiring_career = updates.aspiringCareer;
    if (updates.desiredRole !== undefined)
      dbUpdates.desired_role = updates.desiredRole;
    if (updates.targetIndustry !== undefined)
      dbUpdates.target_industry = updates.targetIndustry;
    if (updates.yearsOfExperience !== undefined)
      dbUpdates.years_of_experience = updates.yearsOfExperience;
    if (updates.skillsFocus !== undefined)
      dbUpdates.skills_focus = updates.skillsFocus;
    if (updates.preferredVoice !== undefined)
      dbUpdates.preferred_voice = updates.preferredVoice;
    if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.locationLastUpdated !== undefined)
      dbUpdates.location_last_updated = updates.locationLastUpdated;
    if (updates.projectPreferences !== undefined)
      dbUpdates.project_preferences = updates.projectPreferences;

    const { data } = await supabaseAdmin
      .from("user_personalization")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toUserPersonalization(data) : undefined;
  }

  // ── Generation Tracking ──────────────────────────────────────

  async getGenerationTracking(
    userId: string
  ): Promise<GenerationTracking | undefined> {
    const { data } = await supabaseAdmin
      .from("generation_tracking")
      .select()
      .eq("user_id", userId)
      .maybeSingle();
    return data ? toGenerationTracking(data) : undefined;
  }

  async createGenerationTracking(
    tracking: InsertGenerationTracking
  ): Promise<GenerationTracking> {
    const { data, error } = await supabaseAdmin
      .from("generation_tracking")
      .insert({
        user_id: tracking.userId ?? null,
        last_daily_generation: tracking.lastDailyGeneration ?? null,
        concept_count_since_last_generation:
          tracking.conceptCountSinceLastGeneration ?? 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toGenerationTracking(data);
  }

  async updateGenerationTracking(
    id: number,
    updates: Partial<InsertGenerationTracking>
  ): Promise<GenerationTracking | undefined> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.lastDailyGeneration !== undefined)
      dbUpdates.last_daily_generation = updates.lastDailyGeneration;
    if (updates.conceptCountSinceLastGeneration !== undefined)
      dbUpdates.concept_count_since_last_generation =
        updates.conceptCountSinceLastGeneration;

    const { data } = await supabaseAdmin
      .from("generation_tracking")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toGenerationTracking(data) : undefined;
  }

  // ── Learner Profiles ─────────────────────────────────────────

  async getLatestLearnerProfile(
    userId: string
  ): Promise<LearnerProfile | undefined> {
    const { data } = await supabaseAdmin
      .from("learner_profiles")
      .select()
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .maybeSingle();
    return data ? toLearnerProfile(data) : undefined;
  }

  async createLearnerProfile(
    profile: InsertLearnerProfile
  ): Promise<LearnerProfile> {
    const { data, error } = await supabaseAdmin
      .from("learner_profiles")
      .insert({
        user_id: profile.userId ?? null,
        profile: profile.profile,
        concepts_included: profile.conceptsIncluded ?? [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toLearnerProfile(data);
  }

  // ── User Claimed Knowledge ───────────────────────────────────

  async getUserClaimedKnowledge(
    userId: string
  ): Promise<UserClaimedKnowledge[]> {
    const { data } = await supabaseAdmin
      .from("user_claimed_knowledge")
      .select()
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false });
    return (data ?? []).map(toUserClaimedKnowledge);
  }

  async createUserClaimedKnowledge(
    knowledge: InsertUserClaimedKnowledge
  ): Promise<UserClaimedKnowledge> {
    const { data, error } = await supabaseAdmin
      .from("user_claimed_knowledge")
      .insert({
        user_id: knowledge.userId ?? null,
        concept_id: knowledge.conceptId,
        source: knowledge.source ?? "other",
        proficiency_level: knowledge.proficiencyLevel ?? "intermediate",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toUserClaimedKnowledge(data);
  }

  // ── Resources ────────────────────────────────────────────────

  async getResources(): Promise<Resource[]> {
    const { data } = await supabaseAdmin
      .from("resources")
      .select()
      .order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }

  async getResourcesByConceptId(conceptId: number): Promise<Resource[]> {
    const { data } = await supabaseAdmin
      .from("resources")
      .select()
      .eq("concept_id", conceptId)
      .order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }

  async getResourcesByProjectId(projectId: number): Promise<Resource[]> {
    const { data } = await supabaseAdmin
      .from("resources")
      .select()
      .eq("project_id", projectId)
      .order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }

  async getResourcesByPrerequisite(
    userId: string,
    prerequisite: string
  ): Promise<Resource[]> {
    const { data } = await supabaseAdmin
      .from("resources")
      .select()
      .eq("user_id", userId)
      .eq("prerequisite", prerequisite)
      .order("relevance_score", { ascending: false });
    return (data ?? []).map(toResource);
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const { data, error } = await supabaseAdmin
      .from("resources")
      .insert({
        user_id: resource.userId ?? null,
        concept_id: resource.conceptId ?? null,
        project_id: resource.projectId ?? null,
        title: resource.title,
        url: resource.url,
        type: resource.type,
        source: resource.source,
        description: resource.description ?? null,
        relevance_score: resource.relevanceScore ?? 50,
        prerequisite: resource.prerequisite ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toResource(data);
  }

  async createMultipleResources(res: InsertResource[]): Promise<Resource[]> {
    if (res.length === 0) return [];
    const rows = res.map((r) => ({
      user_id: r.userId ?? null,
      concept_id: r.conceptId ?? null,
      project_id: r.projectId ?? null,
      title: r.title,
      url: r.url,
      type: r.type,
      source: r.source,
      description: r.description ?? null,
      relevance_score: r.relevanceScore ?? 50,
      prerequisite: r.prerequisite ?? null,
    }));
    const { data, error } = await supabaseAdmin
      .from("resources")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []).map(toResource);
  }

  // ── Idea Sessions ────────────────────────────────────────────

  async getIdeaSessions(userId: string): Promise<IdeaSession[]> {
    const { data } = await supabaseAdmin
      .from("idea_sessions")
      .select()
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    return (data ?? []).map(toIdeaSession);
  }

  async getIdeaSessionById(
    id: number,
    userId: string
  ): Promise<IdeaSession | undefined> {
    const { data } = await supabaseAdmin
      .from("idea_sessions")
      .select()
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    return data ? toIdeaSession(data) : undefined;
  }

  async createIdeaSession(insertSession: InsertIdeaSession): Promise<IdeaSession> {
    const { data, error } = await supabaseAdmin
      .from("idea_sessions")
      .insert({
        user_id: insertSession.userId ?? null,
        title: insertSession.title ?? "New Idea",
        messages: insertSession.messages ?? [],
        idea_summary: insertSession.ideaSummary ?? null,
        analysis: insertSession.analysis ?? null,
        status: insertSession.status ?? "chatting",
        project_id: insertSession.projectId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toIdeaSession(data);
  }

  async updateIdeaSession(
    id: number,
    updates: Partial<InsertIdeaSession>
  ): Promise<IdeaSession | undefined> {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
    if (updates.ideaSummary !== undefined)
      dbUpdates.idea_summary = updates.ideaSummary;
    if (updates.analysis !== undefined) dbUpdates.analysis = updates.analysis;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.projectId !== undefined)
      dbUpdates.project_id = updates.projectId;

    const { data } = await supabaseAdmin
      .from("idea_sessions")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();
    return data ? toIdeaSession(data) : undefined;
  }

  async deleteIdeaSession(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from("idea_sessions")
      .delete()
      .eq("id", id);
    return !error;
  }

  // ── Data Deletion ────────────────────────────────────────────

  async clearAllChatHistory(userId: string): Promise<number> {
    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId);
    const sessionIds = (sessions ?? []).map((s: any) => s.id);
    let msgCount = 0;
    if (sessionIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from("chat_messages")
        .delete()
        .in("session_id", sessionIds)
        .select("id");
      msgCount = (msgs ?? []).length;
    }
    const { data: deletedSessions } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("user_id", userId)
      .select("id");
    return msgCount + (deletedSessions ?? []).length;
  }

  async clearAllProjects(userId: string): Promise<number> {
    await supabaseAdmin
      .from("project_feedback")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("project_interactions")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("user_mastered_prerequisites")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("resources").delete().eq("user_id", userId);

    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId);
    if (sessions && sessions.length > 0) {
      await supabaseAdmin
        .from("chat_messages")
        .delete()
        .in("session_id", sessions.map((s: any) => s.id));
    }
    await supabaseAdmin.from("chat_sessions").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("opportunity_projects")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("trends").delete().eq("user_id", userId);

    const { data: deleted } = await supabaseAdmin
      .from("implementations")
      .delete()
      .eq("user_id", userId)
      .select("id");
    return (deleted ?? []).length;
  }

  async deleteConceptsWithProjects(conceptIds: number[]): Promise<number> {
    if (conceptIds.length === 0) return 0;
    let totalDeleted = 0;
    for (const conceptId of conceptIds) {
      const { data: impls } = await supabaseAdmin
        .from("implementations")
        .select("id")
        .eq("concept_id", conceptId);
      const implIds = (impls ?? []).map((i: any) => i.id);

      if (implIds.length > 0) {
        const { data: implSessions } = await supabaseAdmin
          .from("chat_sessions")
          .select("id")
          .in("project_id", implIds);
        if (implSessions && implSessions.length > 0) {
          await supabaseAdmin
            .from("chat_messages")
            .delete()
            .in("session_id", implSessions.map((s: any) => s.id));
          await supabaseAdmin
            .from("chat_sessions")
            .delete()
            .in("id", implSessions.map((s: any) => s.id));
        }
        await supabaseAdmin
          .from("project_feedback")
          .delete()
          .in("implementation_id", implIds);
        await supabaseAdmin
          .from("user_mastered_prerequisites")
          .delete()
          .in("implementation_id", implIds);
        await supabaseAdmin
          .from("project_interactions")
          .delete()
          .in("project_id", implIds);
      }

      const { data: conceptSessions } = await supabaseAdmin
        .from("chat_sessions")
        .select("id")
        .eq("concept_id", conceptId);
      if (conceptSessions && conceptSessions.length > 0) {
        await supabaseAdmin
          .from("chat_messages")
          .delete()
          .in("session_id", conceptSessions.map((s: any) => s.id));
        await supabaseAdmin
          .from("chat_sessions")
          .delete()
          .in("id", conceptSessions.map((s: any) => s.id));
      }

      await supabaseAdmin
        .from("resources")
        .delete()
        .eq("concept_id", conceptId);
      await supabaseAdmin
        .from("user_claimed_knowledge")
        .delete()
        .eq("concept_id", conceptId);
      await supabaseAdmin
        .from("implementations")
        .delete()
        .eq("concept_id", conceptId);

      const { data: deleted } = await supabaseAdmin
        .from("concepts")
        .delete()
        .eq("id", conceptId)
        .select("id");
      totalDeleted += (deleted ?? []).length;
    }
    return totalDeleted;
  }

  async deleteAllData(userId: string): Promise<{
    concepts: number;
    implementations: number;
    sessions: number;
    messages: number;
  }> {
    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId);
    const sessionIds = (sessions ?? []).map((s: any) => s.id);

    let msgCount = 0;
    if (sessionIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from("chat_messages")
        .delete()
        .in("session_id", sessionIds)
        .select("id");
      msgCount = (msgs ?? []).length;
    }
    const { data: deletedSessions } = await supabaseAdmin
      .from("chat_sessions")
      .delete()
      .eq("user_id", userId)
      .select("id");
    const { data: deletedImpls } = await supabaseAdmin
      .from("implementations")
      .delete()
      .eq("user_id", userId)
      .select("id");
    const { data: deletedConcepts } = await supabaseAdmin
      .from("concepts")
      .delete()
      .eq("user_id", userId)
      .select("id");

    await supabaseAdmin
      .from("project_feedback")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("project_interactions")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("opportunity_projects")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("trends").delete().eq("user_id", userId);
    await supabaseAdmin.from("resources").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("user_mastered_prerequisites")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("generation_tracking")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("learner_profiles")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin
      .from("user_claimed_knowledge")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("idea_sessions").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("user_personalization")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);

    return {
      concepts: (deletedConcepts ?? []).length,
      implementations: (deletedImpls ?? []).length,
      sessions: (deletedSessions ?? []).length,
      messages: msgCount,
    };
  }
}

export const storage = new DbStorage();
