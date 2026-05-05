
REVOKE EXECUTE ON FUNCTION public.current_user_league_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_league_id() TO authenticated;
