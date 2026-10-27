CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to delete an account'
      USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.chat_messages WHERE user_id = current_user_id;
  DELETE FROM public.project_feedback WHERE user_id = current_user_id;
  DELETE FROM public.user_mastered_prerequisites WHERE user_id = current_user_id;
  DELETE FROM public.user_claimed_knowledge WHERE user_id = current_user_id;
  DELETE FROM public.chat_sessions WHERE user_id = current_user_id;
  DELETE FROM public.implementations WHERE user_id = current_user_id;
  DELETE FROM public.opportunity_projects WHERE user_id = current_user_id;
  DELETE FROM public.project_interactions WHERE user_id = current_user_id;
  DELETE FROM public.resources WHERE user_id = current_user_id;
  DELETE FROM public.trends WHERE user_id = current_user_id;
  DELETE FROM public.concepts WHERE user_id = current_user_id;
  DELETE FROM public.generation_tracking WHERE user_id = current_user_id;
  DELETE FROM public.idea_sessions WHERE user_id = current_user_id;
  DELETE FROM public.learner_profiles WHERE user_id = current_user_id;
  DELETE FROM public.user_personalization WHERE user_id = current_user_id;
  DELETE FROM public.user_settings WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
