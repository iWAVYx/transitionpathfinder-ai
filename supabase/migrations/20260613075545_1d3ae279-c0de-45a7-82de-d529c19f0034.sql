
DROP POLICY IF EXISTS "Authenticated can read scoped realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read scoped realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Anchored user-scoped topic: must be exactly "user:<uid>" or "user:<uid>:..."
    realtime.topic() ~ ('^user:' || (auth.uid())::text || '(:|$)')
    OR (
      -- Student-scoped topic: must start with "student:<uuid>" (or "student_"/"student-"), and caller must have access
      realtime.topic() ~ '^student[:_-][0-9a-f-]{36}'
      AND public.can_access_student(
        auth.uid(),
        ((regexp_match(realtime.topic(), '^student[:_-]([0-9a-f-]{36})'))[1])::uuid
      )
    )
  );
