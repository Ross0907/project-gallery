
-- Restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Anyone can delete gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Anyone can insert hosted pdfs" ON public.hosted_pdfs;
DROP POLICY IF EXISTS "Anyone can delete hosted pdfs" ON public.hosted_pdfs;

CREATE POLICY "Authenticated users can insert gallery items"
  ON public.gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete gallery items"
  ON public.gallery_items FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert hosted pdfs"
  ON public.hosted_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete hosted pdfs"
  ON public.hosted_pdfs FOR DELETE
  TO authenticated
  USING (true);
