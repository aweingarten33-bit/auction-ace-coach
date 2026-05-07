ALTER TABLE public.league_auction_history
  ADD COLUMN IF NOT EXISTS was_my_pick boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS league_auction_history_my_picks_idx
  ON public.league_auction_history (user_id, was_my_pick)
  WHERE was_my_pick = true;