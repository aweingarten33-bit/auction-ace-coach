ALTER TABLE public.espn_player_ranks
  ADD COLUMN IF NOT EXISTS injury_status text,
  ADD COLUMN IF NOT EXISTS injury_note text,
  ADD COLUMN IF NOT EXISTS injury_source text,
  ADD COLUMN IF NOT EXISTS injury_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS espn_player_ranks_name_norm_idx
  ON public.espn_player_ranks (player_name_norm);