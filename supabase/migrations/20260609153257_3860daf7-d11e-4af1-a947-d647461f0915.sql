
CREATE TABLE public.league_snapshots (
  league_id bigint NOT NULL,
  season_id integer NOT NULL,
  importer_user_id uuid,
  league_name text,
  num_teams integer,
  scoring text,
  auction_budget integer,
  roster_slots jsonb DEFAULT '{}'::jsonb,
  teams jsonb DEFAULT '[]'::jsonb,
  keeper_summary jsonb DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, season_id)
);

GRANT SELECT ON public.league_snapshots TO authenticated;
GRANT ALL ON public.league_snapshots TO service_role;

ALTER TABLE public.league_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members can read their league snapshot"
  ON public.league_snapshots FOR SELECT
  TO authenticated
  USING (league_id = public.current_user_league_id());
