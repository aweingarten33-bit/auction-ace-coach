CREATE TABLE public.draftsharks_sf_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  player_name_norm TEXT NOT NULL UNIQUE,
  team TEXT,
  position TEXT NOT NULL,
  overall_rank INT,
  position_rank INT,
  value_200 INT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX draftsharks_sf_values_norm_idx ON public.draftsharks_sf_values (player_name_norm);
GRANT SELECT ON public.draftsharks_sf_values TO authenticated, anon;
GRANT ALL ON public.draftsharks_sf_values TO service_role;
ALTER TABLE public.draftsharks_sf_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read draftsharks values" ON public.draftsharks_sf_values FOR SELECT USING (true);
CREATE TRIGGER set_updated_at_draftsharks BEFORE UPDATE ON public.draftsharks_sf_values FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();