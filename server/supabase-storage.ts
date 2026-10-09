import type {
  User,
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
  InsertUser,
} from "@shared/schema";
import { getSupabaseClient, getSupabaseContext } from "./supabase-context";

type Query = any;

const dateFields = new Set([
  "createdAt",
  "updatedAt",
  "lastAccessedAt",
  "lastMessageAt",
  "publishedAt",
  "completedAt",
  "lastDailyGeneration",
  "claimedAt",
  "fetchedAt",
  "masteredAt",
  "locationLastUpdated",
]);

function toDatabaseColumn(key: string) {
  if (key === "where") return "where_applications";
  if (key === "when") return "when_context";
  if (key === "avatarData") return "avatar_url";
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toDatabaseRow(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [toDatabaseColumn(key), fieldValue]),
  );
}

function fromDatabaseRow<T>(row: Record<string, unknown>, table: string): T {
  const converted: Record<string, unknown> = {};
  for (const [databaseKey, value] of Object.entries(row)) {
    const key =
      databaseKey === "where_applications"
        ? "where"
        : databaseKey === "when_context"
          ? "when"
          : databaseKey.replace(/_([a-z])/g, (_match, letter: string) =>
              letter.toUpperCase(),
            );
    converted[key] =
      dateFields.has(key) && typeof value === "string" ? new Date(value) : value;
  }

  if (table === "profiles") {
    converted.avatarData = converted.avatarUrl ?? null;
  }

  return converted as T;
}

function throwSupabaseError(error: { message: string; code?: string }) {
  const code = error.code ? ` (${error.code})` : "";
  throw new Error(`Supabase request failed${code}: ${error.message}`);
}

async function selectRows<T>(
  table: string,
  configure?: (query: Query) => Query,
): Promise<T[]> {
  let query = getSupabaseClient().from(table as any).select("*");
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) throwSupabaseError(error);
  return (data ?? []).map((row: Record<string, unknown>) =>
    fromDatabaseRow<T>(row, table),
  );
}

async function selectOne<T>(
  table: string,
  configure: (query: Query) => Query,
): Promise<T | undefined> {
  const rows = await selectRows<T>(table, configure);
  return rows[0];
}

async function insertOne<T>(table: string, value: object): Promise<T> {
  const { data, error } = await getSupabaseClient()
    .from(table as any)
    .insert(toDatabaseRow(value as Record<string, unknown>))
    .select("*")
    .single();
  if (error) throwSupabaseError(error);
  return fromDatabaseRow<T>(data as Record<string, unknown>, table);
}

async function insertMany<T>(table: string, values: object[]): Promise<T[]> {
  if (values.length === 0) return [];
  const { data, error } = await getSupabaseClient()
    .from(table as any)
    .insert(values.map((value) => toDatabaseRow(value as Record<string, unknown>)))
    .select("*");
  if (error) throwSupabaseError(error);
  return (data ?? []).map((row: Record<string, unknown>) =>
    fromDatabaseRow<T>(row, table),
  );
}

async function updateOne<T>(
  table: string,
  id: number | string,
  updates: object,
  extraFilter?: (query: Query) => Query,
): Promise<T | undefined> {
  let query = getSupabaseClient()
    .from(table as any)
    .update(toDatabaseRow(updates as Record<string, unknown>))
    .eq("id", id);
  if (extraFilter) query = extraFilter(query);
  const { data, error } = await query.select("*");
  if (error) throwSupabaseError(error);
  const row = data?.[0];
  return row ? fromDatabaseRow<T>(row, table) : undefined;
}

async function deleteRows(
  table: string,
  configure?: (query: Query) => Query,
): Promise<number> {
  let query = getSupabaseClient().from(table as any).delete();
  if (configure) query = configure(query);
  const { data, error } = await query.select("id");
  if (error) throwSupabaseError(error);
  return data?.length ?? 0;
}

async function deleteIds(table: string, column: string, ids: number[]) {
  if (ids.length === 0) return 0;
  return deleteRows(table, (query) => query.in(column, ids));
}

export class SupabaseStorage {
  async getUser(id: string): Promise<User | undefined> {
    return selectOne<User>("profiles", (query) => query.eq("id", id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return selectOne<User>("profiles", (query) =>
      query.eq("username", username),
    );
  }

  async createUser(_user: InsertUser): Promise<User> {
    throw new Error("Create accounts through Supabase Auth.");
  }

  async updateUser(
    id: string,
    updates: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const { password: _password, ...profileUpdates } = updates;
    return updateOne<User>("profiles", id, profileUpdates);
  }

  async deleteUser(id: string): Promise<boolean> {
    const { userId } = getSupabaseContext();
    if (!userId || userId !== id) {
      throw new Error("You can only delete the currently signed-in account.");
    }
    const { error } = await getSupabaseClient().rpc("delete_my_account");
    if (error) throwSupabaseError(error);
    return true;
  }

  async getConcepts(userId?: string): Promise<Concept[]> {
    return selectRows("concepts", (query) => {
      const filtered = userId ? query.eq("user_id", userId) : query;
      return filtered.order("created_at", { ascending: false });
    });
  }

  async getConceptById(id: number): Promise<Concept | undefined> {
    return selectOne("concepts", (query) => query.eq("id", id));
  }

  async createConcept(concept: InsertConcept): Promise<Concept> {
    return insertOne("concepts", concept);
  }

  async updateConcept(
    id: number,
    updates: Partial<Concept>,
  ): Promise<Concept | undefined> {
    return updateOne("concepts", id, updates);
  }

  async deleteConcept(id: number): Promise<boolean> {
    return (await deleteRows("concepts", (query) => query.eq("id", id))) > 0;
  }

  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    return selectRows("chat_sessions", (query) => {
      const filtered = userId ? query.eq("user_id", userId) : query;
      return filtered.order("last_message_at", { ascending: false });
    });
  }

  async getChatSessionById(
    id: number,
    userId?: string,
  ): Promise<ChatSession | undefined> {
    return selectOne("chat_sessions", (query) => {
      const filtered = query.eq("id", id);
      return userId ? filtered.eq("user_id", userId) : filtered;
    });
  }

  async getChatSessionByConceptId(
    conceptId: number,
  ): Promise<ChatSession | undefined> {
    return selectOne("chat_sessions", (query) =>
      query.eq("concept_id", conceptId),
    );
  }

  async getChatSessionByProjectId(
    projectId: number,
  ): Promise<ChatSession | undefined> {
    return selectOne("chat_sessions", (query) =>
      query.eq("project_id", projectId),
    );
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    return insertOne("chat_sessions", session);
  }

  async updateChatSession(
    id: number,
    updates: Partial<InsertChatSession>,
  ): Promise<ChatSession | undefined> {
    return updateOne("chat_sessions", id, {
      ...updates,
      lastMessageAt: new Date(),
    });
  }

  async deleteChatSession(id: number): Promise<boolean> {
    return (await deleteRows("chat_sessions", (query) => query.eq("id", id))) > 0;
  }

  async getChatMessagesBySessionId(sessionId: number): Promise<ChatMessage[]> {
    return selectRows("chat_messages", (query) =>
      query.eq("session_id", sessionId).order("created_at"),
    );
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const created = await insertOne<ChatMessage>("chat_messages", message);
    await updateOne("chat_sessions", message.sessionId, {
      lastMessageAt: new Date(),
    });
    return created;
  }

  async getImplementations(userId?: string): Promise<Implementation[]> {
    return selectRows("implementations", (query) => {
      const filtered = userId ? query.eq("user_id", userId) : query;
      return filtered.order("created_at", { ascending: false });
    });
  }

  async getImplementationById(
    id: number,
    userId?: string,
  ): Promise<Implementation | undefined> {
    return selectOne("implementations", (query) => {
      const filtered = query.eq("id", id);
      return userId ? filtered.eq("user_id", userId) : filtered;
    });
  }

  async getImplementation(id: number): Promise<Implementation | undefined> {
    return this.getImplementationById(id);
  }

  async getImplementationsByConceptId(
    conceptId: number,
  ): Promise<Implementation[]> {
    return selectRows("implementations", (query) =>
      query
        .eq("concept_id", conceptId)
        .order("created_at", { ascending: false }),
    );
  }

  async getSimilarImplementations(
    type: string,
    tool: string,
    language: string,
    limit = 3,
  ): Promise<Implementation[]> {
    const rows = await selectRows<Implementation>("implementations", (query) =>
      query.order("created_at", { ascending: false }),
    );
    return rows
      .filter((implementation) => implementation.instructions?.trim())
      .map((implementation) => {
        let score = 0;
        if (implementation.type?.toLowerCase() === type.toLowerCase()) score += 3;
        if (implementation.tool?.toLowerCase() === tool.toLowerCase()) score += 2;
        if (implementation.language?.toLowerCase() === language.toLowerCase()) score += 2;
        return { implementation, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ implementation }) => implementation);
  }

  async createImplementation(
    implementation: InsertImplementation,
  ): Promise<Implementation> {
    return insertOne("implementations", implementation);
  }

  async updateImplementation(
    id: number,
    updates: Partial<Implementation>,
  ): Promise<Implementation | undefined> {
    return updateOne("implementations", id, updates);
  }

  async deleteImplementation(id: number): Promise<boolean> {
    return (await deleteRows("implementations", (query) => query.eq("id", id))) > 0;
  }

  async createProjectFeedback(
    feedback: InsertProjectFeedback,
  ): Promise<ProjectFeedback> {
    return insertOne("project_feedback", feedback);
  }

  async getProjectFeedbackByImplementationId(
    implementationId: number,
  ): Promise<ProjectFeedback | undefined> {
    return selectOne("project_feedback", (query) =>
      query.eq("implementation_id", implementationId),
    );
  }

  async getTrends(userId?: string): Promise<Trend[]> {
    return selectRows("trends", (query) => {
      const filtered = userId ? query.eq("user_id", userId) : query;
      return filtered.order("published_at", { ascending: false });
    });
  }

  async getTrendById(
    id: number,
    userId: string,
  ): Promise<Trend | undefined> {
    return selectOne("trends", (query) => {
      return query.eq("id", id).eq("user_id", userId);
    });
  }

  async getTrendsByCategory(category: string): Promise<Trend[]> {
    return selectRows("trends", (query) =>
      query
        .eq("category", category)
        .order("published_at", { ascending: false }),
    );
  }

  async createTrend(trend: InsertTrend): Promise<Trend> {
    return insertOne("trends", trend);
  }

  async updateTrend(
    id: number,
    updates: Partial<InsertTrend>,
    userId: string,
  ): Promise<Trend | undefined> {
    return updateOne("trends", id, updates, (query) =>
      query.eq("user_id", userId),
    );
  }

  async deleteTrend(id: number): Promise<boolean> {
    return (await deleteRows("trends", (query) => query.eq("id", id))) > 0;
  }

  async getOpportunityProjects(userId?: string): Promise<OpportunityProject[]> {
    return selectRows("opportunity_projects", (query) => {
      const filtered = userId ? query.eq("user_id", userId) : query;
      return filtered.order("created_at", { ascending: false });
    });
  }

  async getOpportunityProjectById(
    id: number,
    userId?: string,
  ): Promise<OpportunityProject | undefined> {
    return selectOne("opportunity_projects", (query) => {
      const filtered = query.eq("id", id);
      return userId ? filtered.eq("user_id", userId) : filtered;
    });
  }

  async createOpportunityProject(
    project: InsertOpportunityProject,
  ): Promise<OpportunityProject> {
    return insertOne("opportunity_projects", project);
  }

  async updateOpportunityProject(
    id: number,
    updates: Partial<OpportunityProject>,
  ): Promise<OpportunityProject | undefined> {
    return updateOne("opportunity_projects", id, updates);
  }

  async deleteOpportunityProject(id: number): Promise<boolean> {
    return (
      (await deleteRows("opportunity_projects", (query) => query.eq("id", id))) >
      0
    );
  }

  async createProjectInteraction(
    interaction: InsertProjectInteraction,
  ): Promise<ProjectInteraction> {
    return insertOne("project_interactions", interaction);
  }

  async getProjectInteractions(): Promise<ProjectInteraction[]> {
    return selectRows("project_interactions", (query) =>
      query.order("created_at", { ascending: false }),
    );
  }

  async getProjectInteractionsByProjectId(
    projectId: number,
  ): Promise<ProjectInteraction[]> {
    return selectRows("project_interactions", (query) =>
      query
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    );
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return selectOne("user_settings", (query) =>
      query.eq("user_id", userId).limit(1),
    );
  }

  async createUserSettings(
    settings: InsertUserSettings,
  ): Promise<UserSettings> {
    return insertOne("user_settings", settings);
  }

  async updateUserSettings(
    id: number,
    updates: Partial<InsertUserSettings>,
  ): Promise<UserSettings | undefined> {
    return updateOne("user_settings", id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async getUserMasteredPrerequisites(
    userId: string,
  ): Promise<UserMasteredPrerequisites[]> {
    return selectRows("user_mastered_prerequisites", (query) =>
      query.eq("user_id", userId),
    );
  }

  async getMasteredPrerequisitesByImplementation(
    implementationId: number,
  ): Promise<UserMasteredPrerequisites[]> {
    return selectRows("user_mastered_prerequisites", (query) =>
      query.eq("implementation_id", implementationId),
    );
  }

  async saveMasteredPrerequisites(
    prerequisites: InsertUserMasteredPrerequisites[],
  ): Promise<UserMasteredPrerequisites[]> {
    return insertMany("user_mastered_prerequisites", prerequisites);
  }

  async createUserMasteredPrerequisite(
    prerequisite: InsertUserMasteredPrerequisites,
  ): Promise<UserMasteredPrerequisites> {
    return insertOne("user_mastered_prerequisites", prerequisite);
  }

  async getProjectVersions(rootId: number): Promise<Implementation[]> {
    const root = await this.getImplementationById(rootId);
    if (!root) return [];
    return selectRows("implementations", (query) =>
      query
        .eq("concept_id", root.conceptId)
        .order("version", { ascending: true }),
    );
  }

  async getLatestVersion(rootId: number): Promise<Implementation | undefined> {
    const versions = await this.getProjectVersions(rootId);
    return versions[0];
  }

  async getUserPersonalization(
    userId: string,
  ): Promise<UserPersonalization | undefined> {
    return selectOne("user_personalization", (query) =>
      query.eq("user_id", userId).limit(1),
    );
  }

  async createUserPersonalization(
    personalization: InsertUserPersonalization,
  ): Promise<UserPersonalization> {
    return insertOne("user_personalization", {
      ...personalization,
      careerGoals: personalization.careerGoals ?? [],
      skillsFocus: personalization.skillsFocus ?? [],
      preferredVoice: personalization.preferredVoice ?? "",
      theme: personalization.theme ?? "system",
      projectPreferences: personalization.projectPreferences ?? {},
    });
  }

  async updateUserPersonalization(
    id: number,
    updates: Partial<InsertUserPersonalization>,
  ): Promise<UserPersonalization | undefined> {
    return updateOne("user_personalization", id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async getGenerationTracking(
    userId: string,
  ): Promise<GenerationTracking | undefined> {
    return selectOne("generation_tracking", (query) =>
      query.eq("user_id", userId).limit(1),
    );
  }

  async createGenerationTracking(
    tracking: InsertGenerationTracking,
  ): Promise<GenerationTracking> {
    return insertOne("generation_tracking", tracking);
  }

  async updateGenerationTracking(
    id: number,
    updates: Partial<InsertGenerationTracking>,
  ): Promise<GenerationTracking | undefined> {
    return updateOne("generation_tracking", id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async getLatestLearnerProfile(
    userId: string,
  ): Promise<LearnerProfile | undefined> {
    return selectOne("learner_profiles", (query) =>
      query
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1),
    );
  }

  async createLearnerProfile(
    profile: InsertLearnerProfile,
  ): Promise<LearnerProfile> {
    return insertOne("learner_profiles", profile);
  }

  async getUserClaimedKnowledge(
    userId: string,
  ): Promise<UserClaimedKnowledge[]> {
    return selectRows("user_claimed_knowledge", (query) =>
      query.eq("user_id", userId).order("claimed_at", { ascending: false }),
    );
  }

  async createUserClaimedKnowledge(
    knowledge: InsertUserClaimedKnowledge,
  ): Promise<UserClaimedKnowledge> {
    return insertOne("user_claimed_knowledge", knowledge);
  }

  async getResources(
    userId?: string,
    conceptId?: number,
    projectId?: number,
  ): Promise<Resource[]> {
    return selectRows("resources", (query) => {
      let filtered = userId ? query.eq("user_id", userId) : query;
      if (conceptId !== undefined) filtered = filtered.eq("concept_id", conceptId);
      if (projectId !== undefined) filtered = filtered.eq("project_id", projectId);
      return filtered.order("relevance_score", { ascending: false });
    });
  }

  async getResourcesByConceptId(conceptId: number): Promise<Resource[]> {
    return selectRows("resources", (query) =>
      query
        .eq("concept_id", conceptId)
        .order("relevance_score", { ascending: false }),
    );
  }

  async getResourcesByProjectId(projectId: number): Promise<Resource[]> {
    return selectRows("resources", (query) =>
      query
        .eq("project_id", projectId)
        .order("relevance_score", { ascending: false }),
    );
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    return insertOne("resources", resource);
  }

  async createMultipleResources(resources: InsertResource[]): Promise<Resource[]> {
    return insertMany("resources", resources);
  }

  async clearAllChatHistory(): Promise<number> {
    const messages = await deleteRows("chat_messages");
    const sessions = await deleteRows("chat_sessions");
    return messages + sessions;
  }

  async clearAllProjects(): Promise<number> {
    const implementations = await selectRows<Implementation>("implementations");
    const opportunities =
      await selectRows<OpportunityProject>("opportunity_projects");
    const implementationIds = implementations.map(({ id }) => id);
    const opportunityIds = opportunities.map(({ id }) => id);

    const projectSessions = await selectRows<ChatSession>(
      "chat_sessions",
      (query) => query.not("project_id", "is", null),
    );
    const sessionIds = projectSessions.map(({ id }) => id);
    await deleteIds("chat_messages", "session_id", sessionIds);
    if (sessionIds.length) {
      await deleteRows("chat_sessions", (query) => query.in("id", sessionIds));
    }

    await deleteRows("project_feedback");
    await deleteRows("project_interactions");
    await deleteRows("user_mastered_prerequisites");
    await deleteIds("resources", "project_id", implementationIds);
    const deletedImplementations = await deleteIds(
      "implementations",
      "id",
      implementationIds,
    );
    const deletedOpportunities = await deleteIds(
      "opportunity_projects",
      "id",
      opportunityIds,
    );
    return deletedImplementations + deletedOpportunities;
  }

  async deleteConceptsWithProjects(conceptIds: number[]): Promise<number> {
    if (conceptIds.length === 0) return 0;

    const concepts = await selectRows<Concept>("concepts", (query) =>
      query.in("id", conceptIds),
    );
    const existingIds = concepts.map(({ id }) => id);
    if (existingIds.length === 0) return 0;

    const implementationRows = await selectRows<Implementation>(
      "implementations",
      (query) => query.in("concept_id", existingIds),
    );
    const implementationIds = implementationRows.map(({ id }) => id);

    const conceptSessions = await selectRows<ChatSession>("chat_sessions", (query) =>
      query.in("concept_id", existingIds),
    );
    const projectSessions =
      implementationIds.length === 0
        ? []
        : await selectRows<ChatSession>("chat_sessions", (query) =>
            query.in("project_id", implementationIds),
          );
    const sessionIds = [
      ...new Set([...conceptSessions, ...projectSessions].map(({ id }) => id)),
    ];

    await deleteIds("chat_messages", "session_id", sessionIds);
    await deleteIds("chat_sessions", "id", sessionIds);
    await deleteIds("project_feedback", "implementation_id", implementationIds);
    await deleteIds(
      "user_mastered_prerequisites",
      "implementation_id",
      implementationIds,
    );
    await deleteIds("resources", "concept_id", existingIds);
    await deleteIds("user_claimed_knowledge", "concept_id", existingIds);

    const titles = new Set(concepts.map(({ title }) => title));
    const trends = await selectRows<Trend>("trends");
    const trendIds = trends
      .filter((trend) =>
        trend.relatedConcepts?.some((title) => titles.has(title)),
      )
      .map(({ id }) => id);
    await deleteIds("trends", "id", trendIds);

    await deleteIds("implementations", "id", implementationIds);
    return deleteIds("concepts", "id", existingIds);
  }

  async deleteAllData(): Promise<{
    concepts: number;
    implementations: number;
    sessions: number;
    messages: number;
  }> {
    const [concepts, implementations, sessions, messages] = await Promise.all([
      selectRows<Concept>("concepts"),
      selectRows<Implementation>("implementations"),
      selectRows<ChatSession>("chat_sessions"),
      selectRows<ChatMessage>("chat_messages"),
    ]);

    await this.clearAllChatHistory();
    await this.clearAllProjects();
    const deletedConcepts = await this.deleteConceptsWithProjects(
      concepts.map(({ id }) => id),
    );
    await deleteRows("trends");
    await deleteRows("resources");
    await deleteRows("user_claimed_knowledge");
    await deleteRows("learner_profiles");

    return {
      concepts: deletedConcepts,
      implementations: implementations.length,
      sessions: sessions.length,
      messages: messages.length,
    };
  }
}

export const storage = new SupabaseStorage();
