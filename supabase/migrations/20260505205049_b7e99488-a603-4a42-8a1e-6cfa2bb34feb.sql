alter table public.espn_player_ranks
  add column if not exists prior_ppg numeric,
  add column if not exists prior_season integer;