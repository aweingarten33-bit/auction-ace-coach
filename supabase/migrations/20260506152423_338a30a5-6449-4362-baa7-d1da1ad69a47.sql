-- Sleeper player master + ADP-derived ranks
CREATE TABLE public.sleeper_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sleeper_player_id text NOT NULL UNIQUE,
  player_name text NOT NULL,
  player_name_norm text NOT NULL,
  position text,
  team text,
  age integer,
  years_exp integer,
  is_rookie boolean NOT NULL DEFAULT false,
  status text,
  injury_status text,
  injury_notes text,
  depth_chart_order integer,
  search_rank integer,         -- Sleeper's overall ADP proxy (lower = better)
  pos_rank integer,            -- derived: rank within position by search_rank
  projected_auction_value numeric,  -- our derived $ (curve from search_rank), pre-league-calibration
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sleeper_players_norm ON public.sleeper_players(player_name_norm);
CREATE INDEX idx_sleeper_players_pos_rank ON public.sleeper_players(position, pos_rank);
CREATE INDEX idx_sleeper_players_rookie ON public.sleeper_players(is_rookie) WHERE is_rookie = true;

ALTER TABLE public.sleeper_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sleeper players"
  ON public.sleeper_players
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER set_sleeper_players_updated_at
  BEFORE UPDATE ON public.sleeper_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
