
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ espn_credentials ============
CREATE TABLE public.espn_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  swid TEXT NOT NULL,
  espn_s2 TEXT NOT NULL,
  league_id BIGINT,
  season_id INT,
  team_id INT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.espn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own espn read" ON public.espn_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own espn write" ON public.espn_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own espn update" ON public.espn_credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own espn delete" ON public.espn_credentials FOR DELETE USING (auth.uid() = user_id);

-- ============ extension_tokens ============
CREATE TABLE public.extension_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own token read" ON public.extension_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own token rotate" ON public.extension_tokens FOR UPDATE USING (auth.uid() = user_id);

-- ============ live_draft_events ============
CREATE TABLE public.live_draft_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('extension','espn_poll','manual')),
  event_type TEXT NOT NULL CHECK (event_type IN ('nomination','bid','won','undo')),
  player_name TEXT,
  player_position TEXT,
  player_team TEXT,
  espn_player_id BIGINT,
  price INT,
  drafter_team_id INT,
  drafter_team_name TEXT,
  raw JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_draft_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events read" ON public.live_draft_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.live_draft_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own events delete" ON public.live_draft_events FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_live_events_user_time ON public.live_draft_events(user_id, occurred_at DESC);

-- ============ trigger: update_updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_espn_updated BEFORE UPDATE ON public.espn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ trigger: auto-create profile + extension token on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));

  INSERT INTO public.extension_tokens (user_id, token)
  VALUES (NEW.id, encode(gen_random_bytes(24), 'hex'));

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
