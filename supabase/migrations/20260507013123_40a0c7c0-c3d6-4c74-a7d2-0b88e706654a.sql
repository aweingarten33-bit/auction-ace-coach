
-- Backfill: make all existing users admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles
ON CONFLICT DO NOTHING;

-- Update signup trigger to also grant admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
