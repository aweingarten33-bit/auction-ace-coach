-- Canonical shared league snapshot (per league+season)
CREATE TABLE IF NOT EXISTS public.league_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id bigint NOT NULL,
  season_id int NOT NULL,
  importer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  league_name text,
  num_teams int,
  scoring text,
  auction_budget int,
  roster_slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  teams jsonb NOT NULL DEFAULT '[]'::jsonb,
  keeper_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, season_id)
);

ALTER TABLE public.league_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league members read snapshots"
ON public.league_snapshots
FOR SELECT
TO authenticated
USING (league_id = public.current_user_league_id());

CREATE POLICY "importer writes own league snapshots"
ON public.league_snapshots
FOR ALL
TO authenticated
USING (auth.uid() = importer_user_id)
WITH CHECK (auth.uid() = importer_user_id);

-- Invite tokens tied to league+season
CREATE TABLE IF NOT EXISTS public.league_invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  league_id bigint NOT NULL,
  season_id int NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.league_invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator manages invite tokens"
ON public.league_invite_tokens
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- League scope on live events
ALTER TABLE public.live_draft_events
  ADD COLUMN IF NOT EXISTS league_id bigint,
  ADD COLUMN IF NOT EXISTS draft_session_id text;

CREATE INDEX IF NOT EXISTS idx_live_events_league_time
  ON public.live_draft_events(league_id, occurred_at DESC);

DROP POLICY IF EXISTS "own events read" ON public.live_draft_events;
CREATE POLICY "league members read live events"
ON public.live_draft_events
FOR SELECT
TO authenticated
USING (league_id IS NOT NULL AND league_id = public.current_user_league_id());

-- Keep insert/delete private to event owner
DROP POLICY IF EXISTS "own events insert" ON public.live_draft_events;
CREATE POLICY "own events insert"
ON public.live_draft_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own events delete" ON public.live_draft_events;
CREATE POLICY "own events delete"
ON public.live_draft_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-stamp league_id from profile on live event insert
CREATE OR REPLACE FUNCTION public.set_live_event_league()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.league_id IS NULL THEN
    SELECT league_id INTO NEW.league_id FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_events_set_league ON public.live_draft_events;
CREATE TRIGGER trg_live_events_set_league
BEFORE INSERT ON public.live_draft_events
FOR EACH ROW EXECUTE FUNCTION public.set_live_event_league();
