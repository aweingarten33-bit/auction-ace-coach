CREATE POLICY "league snapshots insert by importer" ON public.league_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (importer_user_id = auth.uid());

CREATE POLICY "league snapshots update by importer" ON public.league_snapshots
  FOR UPDATE TO authenticated
  USING (importer_user_id = auth.uid())
  WITH CHECK (importer_user_id = auth.uid());

CREATE POLICY "league snapshots delete by importer or admin" ON public.league_snapshots
  FOR DELETE TO authenticated
  USING (importer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));