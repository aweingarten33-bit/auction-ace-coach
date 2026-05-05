
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS league_id bigint;

CREATE OR REPLACE FUNCTION public.current_user_league_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT league_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "league members can read auction history" ON public.league_auction_history;
CREATE POLICY "league members can read auction history"
ON public.league_auction_history
FOR SELECT
TO authenticated
USING (
  league_id IS NOT NULL
  AND league_id = public.current_user_league_id()
);
