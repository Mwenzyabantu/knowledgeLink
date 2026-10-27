CREATE TABLE IF NOT EXISTS public.connect_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career text NOT NULL CHECK (char_length(btrim(career)) BETWEEN 1 AND 160),
  program text NOT NULL CHECK (char_length(btrim(program)) BETWEEN 1 AND 180),
  course_name text NOT NULL CHECK (char_length(btrim(course_name)) BETWEEN 1 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, career, program, course_name)
);

CREATE TABLE IF NOT EXISTS public.connect_course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.connect_courses(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (char_length(btrim(topic)) BETWEEN 1 AND 300),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, position)
);

CREATE TABLE IF NOT EXISTS public.connect_learning_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.connect_courses(id) ON DELETE CASCADE,
  entry_path text NOT NULL CHECK (entry_path IN ('topics', 'known_use')),
  known_use text,
  use_assessment jsonb,
  overview jsonb,
  selected_application jsonb,
  bigger_picture jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (entry_path <> 'known_use' OR char_length(btrim(coalesce(known_use, ''))) BETWEEN 1 AND 1000)
);

CREATE TABLE IF NOT EXISTS public.connect_research_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES public.connect_learning_maps(id) ON DELETE CASCADE,
  query text NOT NULL CHECK (char_length(btrim(query)) BETWEEN 1 AND 240),
  result_count integer NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.connect_research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES public.connect_learning_maps(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.connect_research_rounds(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  source_url text NOT NULL,
  source_name text NOT NULL,
  source_excerpt text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, source_url)
);

CREATE INDEX IF NOT EXISTS connect_courses_user_updated_idx
  ON public.connect_courses (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS connect_course_topics_course_position_idx
  ON public.connect_course_topics (course_id, position);
CREATE INDEX IF NOT EXISTS connect_learning_maps_user_updated_idx
  ON public.connect_learning_maps (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS connect_research_rounds_map_created_idx
  ON public.connect_research_rounds (map_id, created_at DESC);
CREATE INDEX IF NOT EXISTS connect_research_findings_map_retrieved_idx
  ON public.connect_research_findings (map_id, retrieved_at DESC);

ALTER TABLE public.connect_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_learning_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_research_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connect_research_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage their ConnectTheDots courses"
  ON public.connect_courses FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Learners manage topics for their courses"
  ON public.connect_course_topics FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Learners manage their ConnectTheDots maps"
  ON public.connect_learning_maps FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_courses c
      WHERE c.id = course_id AND c.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Learners manage research rounds for their maps"
  ON public.connect_research_rounds FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_learning_maps m
      WHERE m.id = map_id AND m.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_learning_maps m
      WHERE m.id = map_id AND m.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Learners manage findings for their maps"
  ON public.connect_research_findings FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_learning_maps m
      WHERE m.id = map_id AND m.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.connect_learning_maps m
      WHERE m.id = map_id AND m.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.connect_research_rounds r
      WHERE r.id = connect_research_findings.round_id
        AND r.map_id = connect_research_findings.map_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.connect_courses, public.connect_course_topics,
     public.connect_learning_maps, public.connect_research_rounds,
     public.connect_research_findings
  TO authenticated;

CREATE OR REPLACE FUNCTION public.save_connect_course(
  p_course_id uuid,
  p_career text,
  p_program text,
  p_course_name text,
  p_topics text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_course_id uuid;
  v_topic_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF char_length(btrim(coalesce(p_career, ''))) NOT BETWEEN 1 AND 160
     OR char_length(btrim(coalesce(p_program, ''))) NOT BETWEEN 1 AND 180
     OR char_length(btrim(coalesce(p_course_name, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Career, program, and course name are required';
  END IF;

  v_topic_count := coalesce(cardinality(p_topics), 0);
  IF v_topic_count > 80 THEN
    RAISE EXCEPTION 'A course can have at most 80 topics';
  END IF;

  IF p_course_id IS NULL THEN
    INSERT INTO public.connect_courses (user_id, career, program, course_name)
    VALUES (v_user_id, btrim(p_career), btrim(p_program), btrim(p_course_name))
    RETURNING id INTO v_course_id;
  ELSE
    UPDATE public.connect_courses
    SET career = btrim(p_career),
        program = btrim(p_program),
        course_name = btrim(p_course_name),
        updated_at = now()
    WHERE id = p_course_id AND user_id = v_user_id
    RETURNING id INTO v_course_id;

    IF v_course_id IS NULL THEN
      RAISE EXCEPTION 'Course not found';
    END IF;
  END IF;

  DELETE FROM public.connect_course_topics
  WHERE course_id = v_course_id AND user_id = v_user_id;

  INSERT INTO public.connect_course_topics (user_id, course_id, topic, position)
  SELECT v_user_id, v_course_id, btrim(topic), (ordinality - 1)::integer
  FROM (
    SELECT DISTINCT ON (lower(btrim(raw.topic)))
      raw.topic, raw.ordinality
    FROM unnest(coalesce(p_topics, ARRAY[]::text[]))
      WITH ORDINALITY AS raw(topic, ordinality)
    WHERE char_length(btrim(raw.topic)) BETWEEN 1 AND 300
    ORDER BY lower(btrim(raw.topic)), raw.ordinality
  ) AS normalized
  ORDER BY ordinality;

  RETURN v_course_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_connect_course(uuid, text, text, text, text[])
  TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_connect_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER connect_courses_touch_updated_at
  BEFORE UPDATE ON public.connect_courses
  FOR EACH ROW EXECUTE FUNCTION public.touch_connect_updated_at();

CREATE TRIGGER connect_learning_maps_touch_updated_at
  BEFORE UPDATE ON public.connect_learning_maps
  FOR EACH ROW EXECUTE FUNCTION public.touch_connect_updated_at();
