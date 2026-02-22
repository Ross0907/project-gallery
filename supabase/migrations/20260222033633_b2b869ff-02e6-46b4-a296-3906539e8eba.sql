
-- Add user_id column to track ownership
ALTER TABLE public.gallery_items ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.hosted_pdfs ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Backfill existing records with NULL user_id (they'll be owned by no one)
-- We need to update RLS policies

-- Drop old permissive DELETE policies
DROP POLICY "Authenticated users can delete gallery items" ON public.gallery_items;
DROP POLICY "Authenticated users can delete hosted pdfs" ON public.hosted_pdfs;

-- Drop old permissive INSERT policies  
DROP POLICY "Authenticated users can insert gallery items" ON public.gallery_items;
DROP POLICY "Authenticated users can insert hosted pdfs" ON public.hosted_pdfs;

-- Create owner-scoped INSERT policies
CREATE POLICY "Users can insert own gallery items"
  ON public.gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own hosted pdfs"
  ON public.hosted_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create owner-scoped DELETE policies
CREATE POLICY "Users can delete own gallery items"
  ON public.gallery_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hosted pdfs"
  ON public.hosted_pdfs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Set file size limits on storage buckets
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'gallery-images'; -- 10MB
UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'hosted-pdfs'; -- 50MB
