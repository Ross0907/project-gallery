
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
WHERE id = 'gallery-images';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'hosted-pdfs';
