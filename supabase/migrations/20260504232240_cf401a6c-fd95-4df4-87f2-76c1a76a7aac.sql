
-- League auction history pulled from ESPN draftDetail across prior seasons.
CREATE TABLE public.league_auction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  league_id BIGINT NOT NULL,
  season INTEGER NOT NULL,
  espn_player_id BIGINT,
  player_name TEXT NOT NULL,
  position TEXT,
  bid_amount INTEGER NOT NULL,
  team_id INTEGER,
  pick_overall INTEGER,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, league_id, season, espn_player_id, pick_overall)
);

CREATE INDEX idx_lah_user_player ON public.league_auction_history (user_id, player_name);
CREATE INDEX idx_lah_user_season ON public.league_auction_history (user_id, season);

ALTER TABLE public.league_auction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own auction history read"
  ON public.league_auction_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own auction history insert"
  ON public.league_auction_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own auction history delete"
  ON public.league_auction_history FOR DELETE
  USING (auth.uid() = user_id);
