
-- Create storage buckets for images and PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('hosted-pdfs', 'hosted-pdfs', true);

-- RLS policies for gallery-images (public read, anyone can upload)
CREATE POLICY "Public read gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-images');

CREATE POLICY "Anyone can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Anyone can delete gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery-images');

-- RLS policies for hosted-pdfs (public read, anyone can upload)
CREATE POLICY "Public read hosted pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'hosted-pdfs');

CREATE POLICY "Anyone can upload hosted pdfs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hosted-pdfs');

CREATE POLICY "Anyone can delete hosted pdfs"
ON storage.objects FOR DELETE
USING (bucket_id = 'hosted-pdfs');

-- Table to store metadata for gallery images
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery items"
ON public.gallery_items FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert gallery items"
ON public.gallery_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete gallery items"
ON public.gallery_items FOR DELETE
USING (true);

-- Table to store metadata for hosted PDFs
CREATE TABLE public.hosted_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hosted_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hosted pdfs"
ON public.hosted_pdfs FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert hosted pdfs"
ON public.hosted_pdfs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete hosted pdfs"
ON public.hosted_pdfs FOR DELETE
USING (true);
