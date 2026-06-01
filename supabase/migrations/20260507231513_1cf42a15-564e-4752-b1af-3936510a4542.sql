
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS espn_team_id integer,
  ADD COLUMN IF NOT EXISTS espn_team_name text,
  ADD COLUMN IF NOT EXISTS strategy_preset text,
  ADD COLUMN IF NOT EXISTS strategy_custom text;
