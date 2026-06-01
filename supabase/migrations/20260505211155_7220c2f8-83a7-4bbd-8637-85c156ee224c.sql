
CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id, locked) VALUES (true, false);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read app settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
