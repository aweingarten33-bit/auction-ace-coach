-- Restrict admin role to a single email
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

  IF lower(NEW.email) = 'aweingarten33@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Remove admin from anyone who isn't the designated admin email
DELETE FROM public.user_roles
WHERE role = 'admin'::app_role
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'aweingarten33@gmail.com'
  );

-- Grant admin to the designated email if that user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'aweingarten33@gmail.com'
ON CONFLICT DO NOTHING;