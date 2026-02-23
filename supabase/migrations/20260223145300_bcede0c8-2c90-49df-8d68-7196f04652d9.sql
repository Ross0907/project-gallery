-- Add sort_order column for manual tile reordering
ALTER TABLE public.gallery_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on current created_at order (newest first = lowest number)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM public.gallery_items
)
UPDATE public.gallery_items SET sort_order = ordered.rn
FROM ordered WHERE gallery_items.id = ordered.id;