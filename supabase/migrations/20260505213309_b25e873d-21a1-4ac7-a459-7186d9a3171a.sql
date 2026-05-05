-- Allowlist mapping emails to leagues; on signup, profile.league_id auto-fills
CREATE TABLE public.league_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  league_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.league_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage invites"
ON public.league_invites
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Replace handle_new_user to also pick up an allowlisted league_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  invited_league bigint;
BEGIN
  SELECT league_id INTO invited_league
  FROM public.league_invites
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  INSERT INTO public.profiles (user_id, email, display_name, league_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    invited_league
  );

  INSERT INTO public.extension_tokens (user_id, token)
  VALUES (NEW.id, encode(extensions.gen_random_bytes(24), 'hex'));

  RETURN NEW;
END;
$$;

-- Seed your partner
INSERT INTO public.league_invites (email, league_id)
VALUES ('mmehler@gmail.com', 164861)
ON CONFLICT (email) DO UPDATE SET league_id = EXCLUDED.league_id;