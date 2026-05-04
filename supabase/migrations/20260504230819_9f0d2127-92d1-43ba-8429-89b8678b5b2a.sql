DROP POLICY IF EXISTS "Authenticated users can read vetri notes" ON public.vetri_notes;
CREATE POLICY "Anyone can read vetri notes"
  ON public.vetri_notes FOR SELECT
  TO anon, authenticated
  USING (true);