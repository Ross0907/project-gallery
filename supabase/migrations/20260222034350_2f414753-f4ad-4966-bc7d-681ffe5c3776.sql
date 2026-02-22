
CREATE POLICY "Users can update own gallery items"
  ON public.gallery_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
