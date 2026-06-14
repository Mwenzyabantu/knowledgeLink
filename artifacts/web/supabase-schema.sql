-- KnowledgeLInk Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS (extends auth.users via trigger)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CONCEPTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.concepts (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_input text,
  title text NOT NULL,
  category text NOT NULL,
  problem text NOT NULL,
  what text NOT NULL,
  why text NOT NULL,
  how text NOT NULL,
  where_applications jsonb NOT NULL DEFAULT '[]',
  who text NOT NULL,
  when_context text NOT NULL,
  pseudocode text,
  tags jsonb NOT NULL DEFAULT '[]',
  is_favorite boolean NOT NULL DEFAULT false,
  prerequisites jsonb NOT NULL DEFAULT '{"essential":[],"helpful":[],"optional":[]}',
  created_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 3. CHAT SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  concept_id integer,
  project_id integer,
  tags jsonb NOT NULL DEFAULT '[]',
  is_collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_message_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 4. CHAT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 5. TRENDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.trends (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  image_description text,
  source text NOT NULL,
  source_url text,
  relevance_to_user text NOT NULL,
  related_concepts jsonb NOT NULL DEFAULT '[]',
  category text NOT NULL,
  published_at timestamptz DEFAULT now() NOT NULL,
  read_by_user boolean NOT NULL DEFAULT false,
  user_rating integer
);

-- ============================================
-- 6. IMPLEMENTATIONS (Projects)
-- ============================================
CREATE TABLE IF NOT EXISTS public.implementations (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id integer NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  chat_history_id integer,
  project_name text NOT NULL,
  type text NOT NULL,
  tool text NOT NULL,
  language text NOT NULL,
  image_url text,
  components jsonb NOT NULL DEFAULT '[]',
  learning_goals jsonb NOT NULL DEFAULT '[]',
  expected_outcomes jsonb NOT NULL DEFAULT '[]',
  required_artifacts jsonb NOT NULL DEFAULT '[]',
  problem_addressed text,
  why_suggested text,
  real_world_context text,
  industry text,
  code text,
  pseudocode text,
  flow_diagram text,
  instructions text,
  status text NOT NULL DEFAULT 'preview',
  version integer NOT NULL DEFAULT 1,
  previous_version_id integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 7. PROJECT FEEDBACK
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_feedback (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  implementation_id integer NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  difficulty_rating integer NOT NULL,
  enjoyment_rating integer NOT NULL,
  met_objectives jsonb NOT NULL DEFAULT '[]',
  learnt_skills jsonb NOT NULL DEFAULT '[]',
  outcome_matches boolean NOT NULL DEFAULT true,
  feedback_text text,
  completed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 8. OPPORTUNITY PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.opportunity_projects (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  difficulty text NOT NULL,
  estimated_hours integer NOT NULL,
  skills jsonb NOT NULL DEFAULT '[]',
  related_concept_ids jsonb NOT NULL DEFAULT '[]',
  recommended_implementation_id integer,
  location_context text,
  problem_type text NOT NULL DEFAULT 'everyday',
  created_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 9. PROJECT INTERACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_interactions (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id integer NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 10. GENERATION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.generation_tracking (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  last_daily_generation timestamptz,
  concept_count_since_last_generation integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 11. LEARNER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.learner_profiles (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile text NOT NULL,
  concepts_included jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 12. USER CLAIMED KNOWLEDGE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_claimed_knowledge (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id integer NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'other',
  proficiency_level text NOT NULL DEFAULT 'intermediate',
  claimed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 13. RESOURCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.resources (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id integer,
  project_id integer,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL,
  source text NOT NULL,
  description text,
  relevance_score integer NOT NULL DEFAULT 50,
  prerequisite text,
  fetched_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 14. USER SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_concept_count_generation boolean NOT NULL DEFAULT true,
  enable_daily_generation boolean NOT NULL DEFAULT true,
  concept_count_threshold integer NOT NULL DEFAULT 3,
  daily_generation_frequency_days integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 15. USER MASTERED PREREQUISITES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_mastered_prerequisites (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  implementation_id integer NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  prerequisite text NOT NULL,
  mastered_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 16. USER PERSONALIZATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_personalization (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  career_goals jsonb NOT NULL DEFAULT '[]',
  current_career text,
  aspiring_career text,
  desired_role text,
  target_industry text,
  years_of_experience integer,
  skills_focus jsonb NOT NULL DEFAULT '[]',
  preferred_voice text NOT NULL DEFAULT '',
  theme text NOT NULL DEFAULT 'system',
  location text,
  location_last_updated timestamptz,
  project_preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 17. IDEA SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.idea_sessions (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Idea',
  messages jsonb NOT NULL DEFAULT '[]',
  idea_summary text,
  analysis jsonb,
  status text NOT NULL DEFAULT 'chatting',
  project_id integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_claimed_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mastered_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can view own %s" ON public.%s',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can insert own %s" ON public.%s',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can update own %s" ON public.%s',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can delete own %s" ON public.%s',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Helper function for user check
CREATE OR REPLACE FUNCTION public.is_current_user(target_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN target_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for all tables
CREATE POLICY "Users can view own concepts" ON public.concepts
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own concepts" ON public.concepts
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own concepts" ON public.concepts
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own concepts" ON public.concepts
  FOR DELETE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own chat_sessions" ON public.chat_sessions
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own chat_sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own chat_sessions" ON public.chat_sessions
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own chat_sessions" ON public.chat_sessions
  FOR DELETE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own chat_messages" ON public.chat_messages
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own chat_messages" ON public.chat_messages
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own trends" ON public.trends
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own trends" ON public.trends
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own trends" ON public.trends
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own trends" ON public.trends
  FOR DELETE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own implementations" ON public.implementations
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own implementations" ON public.implementations
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own implementations" ON public.implementations
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own implementations" ON public.implementations
  FOR DELETE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own project_feedback" ON public.project_feedback
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own project_feedback" ON public.project_feedback
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own opportunity_projects" ON public.opportunity_projects
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own opportunity_projects" ON public.opportunity_projects
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own opportunity_projects" ON public.opportunity_projects
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own opportunity_projects" ON public.opportunity_projects
  FOR DELETE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own project_interactions" ON public.project_interactions
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own project_interactions" ON public.project_interactions
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own generation_tracking" ON public.generation_tracking
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own generation_tracking" ON public.generation_tracking
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own generation_tracking" ON public.generation_tracking
  FOR UPDATE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own learner_profiles" ON public.learner_profiles
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own learner_profiles" ON public.learner_profiles
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own user_claimed_knowledge" ON public.user_claimed_knowledge
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own user_claimed_knowledge" ON public.user_claimed_knowledge
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own resources" ON public.resources
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own resources" ON public.resources
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own user_settings" ON public.user_settings
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own user_settings" ON public.user_settings
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own user_settings" ON public.user_settings
  FOR UPDATE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own user_mastered_prerequisites" ON public.user_mastered_prerequisites
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own user_mastered_prerequisites" ON public.user_mastered_prerequisites
  FOR INSERT WITH CHECK (public.is_current_user(user_id));

CREATE POLICY "Users can view own user_personalization" ON public.user_personalization
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own user_personalization" ON public.user_personalization
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own user_personalization" ON public.user_personalization
  FOR UPDATE USING (public.is_current_user(user_id));

CREATE POLICY "Users can view own idea_sessions" ON public.idea_sessions
  FOR SELECT USING (public.is_current_user(user_id));
CREATE POLICY "Users can insert own idea_sessions" ON public.idea_sessions
  FOR INSERT WITH CHECK (public.is_current_user(user_id));
CREATE POLICY "Users can update own idea_sessions" ON public.idea_sessions
  FOR UPDATE USING (public.is_current_user(user_id));
CREATE POLICY "Users can delete own idea_sessions" ON public.idea_sessions
  FOR DELETE USING (public.is_current_user(user_id));

-- Profiles: users can view all profiles but only update their own
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (public.is_current_user(id));

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON public.concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_concepts_created_at ON public.concepts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_concept_id ON public.chat_sessions(concept_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_implementations_user_id ON public.implementations(user_id);
CREATE INDEX IF NOT EXISTS idx_implementations_concept_id ON public.implementations(concept_id);
CREATE INDEX IF NOT EXISTS idx_trends_user_id ON public.trends(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_projects_user_id ON public.opportunity_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_sessions_user_id ON public.idea_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personalization_user_id ON public.user_personalization(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_tracking_user_id ON public.generation_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_profiles_user_id ON public.learner_profiles(user_id);
