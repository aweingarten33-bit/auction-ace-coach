CREATE TABLE public.espn_preseason_ranks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season integer NOT NULL,
  espn_player_id bigint NOT NULL,
  player_name text NOT NULL,
  player_name_norm text NOT NULL,
  position text,
  overall_rank integer,
  pos_rank integer,
  projected_auction_value numeric,
  projected_points numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (season, espn_player_id)
);

CREATE INDEX idx_preseason_ranks_season ON public.espn_preseason_ranks(season);
CREATE INDEX idx_preseason_ranks_name ON public.espn_preseason_ranks(player_name_norm);

ALTER TABLE public.espn_preseason_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read preseason ranks"
ON public.espn_preseason_ranks
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER trg_preseason_ranks_updated
BEFORE UPDATE ON public.espn_preseason_ranks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();