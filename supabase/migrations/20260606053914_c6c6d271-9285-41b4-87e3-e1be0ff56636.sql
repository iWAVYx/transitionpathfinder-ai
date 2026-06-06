-- Broaden realtime.messages policy so user-scoped channels like
-- "goal-statuses-<uid>" and "notifications:<uid>" are permitted, while
-- student-scoped topics still require can_access_student.
DROP POLICY IF EXISTS "Authenticated can read scoped realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated can read scoped realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    -- Any topic containing the caller's own uid is fine (per-user channels)
    realtime.topic() LIKE '%' || auth.uid()::text || '%'
    OR
    -- Student-scoped topics: must reference a student the caller can access
    (
      realtime.topic() ~ 'student[:_-][0-9a-f-]{36}'
      AND public.can_access_student(
        auth.uid(),
        (regexp_match(realtime.topic(), 'student[:_-]([0-9a-f-]{36})'))[1]::uuid
      )
    )
  );

-- Tighten goal_statuses UPDATE USING: require current student access
DROP POLICY IF EXISTS "goal_statuses update own with student access" ON public.goal_statuses;
CREATE POLICY "goal_statuses update own with student access"
  ON public.goal_statuses FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );
