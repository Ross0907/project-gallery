-- Fix 1: Restrict storage DELETE to authenticated owners only
DROP POLICY IF EXISTS "Anyone can delete gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete hosted pdfs" ON storage.objects;

CREATE POLICY "Users can delete own gallery images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gallery-images' AND owner = auth.uid());

CREATE POLICY "Users can delete own hosted pdfs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hosted-pdfs' AND owner = auth.uid());