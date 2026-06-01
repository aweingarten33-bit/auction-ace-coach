
CREATE TABLE public.espn_player_ranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season INTEGER NOT NULL,
  espn_player_id BIGINT NOT NULL,
  player_name TEXT NOT NULL,
  player_name_norm TEXT NOT NULL,
  position TEXT,
  pos_rank INTEGER,
  overall_rank INTEGER,
  projected_points NUMERIC,
  auction_value NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season, espn_player_id)
);

CREATE INDEX idx_epr_name_norm ON public.espn_player_ranks (player_name_norm);
CREATE INDEX idx_epr_season_pos ON public.espn_player_ranks (season, position, pos_rank);

ALTER TABLE public.espn_player_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player ranks"
  ON public.espn_player_ranks FOR SELECT
  TO anon, authenticated
  USING (true);
