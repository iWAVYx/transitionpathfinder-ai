DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact"
  ON public.contact_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(first_name) BETWEEN 1 AND 100
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
    AND (
      (auth.uid() IS NULL AND submitted_by_user_id IS NULL)
      OR (auth.uid() IS NOT NULL AND submitted_by_user_id IS NOT DISTINCT FROM auth.uid())
    )
  );