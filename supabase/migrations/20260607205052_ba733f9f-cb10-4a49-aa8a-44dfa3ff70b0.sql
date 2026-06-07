
-- ============================================================================
-- 1. Extend schema with new fields
-- ============================================================================
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS related_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_partner_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_pathway_report_id uuid REFERENCES public.pathway_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_action_item_id uuid REFERENCES public.action_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS reminder_settings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS color_label text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual';

-- ============================================================================
-- 2. Replace constraints — broaden visibility tiers, validate event_type/status
-- ============================================================================
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_visibility_check,
  DROP CONSTRAINT IF EXISTS calendar_events_check;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_visibility_check CHECK (visibility = ANY (ARRAY[
    'private','team','student_team','family_team',
    'school_team','district_team','partner_only',
    'platform_admin_only','public_event'
  ]));

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_status_check CHECK (status = ANY (ARRAY[
    'scheduled','completed','cancelled','rescheduled','needs_follow_up'
  ]));

-- A team-scoped event must point to something we can scope to.
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_scope_check CHECK (
    visibility IN ('private','platform_admin_only','public_event')
    OR (visibility IN ('team','student_team','family_team') AND student_id IS NOT NULL)
    OR (visibility IN ('school_team','district_team','partner_only') AND related_organization_id IS NOT NULL)
  );

-- Helpful indexes for the new lookups
CREATE INDEX IF NOT EXISTS calendar_events_org_idx
  ON public.calendar_events (related_organization_id, event_date)
  WHERE related_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calendar_events_visibility_idx
  ON public.calendar_events (visibility, event_date);

-- ============================================================================
-- 3. Replace RLS policies for the new visibility tiers
-- ============================================================================
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;

CREATE POLICY calendar_events_select ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (visibility = 'public_event')
    OR (visibility = 'platform_admin_only' AND public.has_audience(auth.uid(), 'admin'))
    OR (visibility IN ('team','student_team','family_team')
        AND student_id IS NOT NULL
        AND public.can_access_student(auth.uid(), student_id))
    OR (visibility IN ('school_team','district_team','partner_only')
        AND related_organization_id IS NOT NULL
        AND public.is_org_member(auth.uid(), related_organization_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      visibility = 'private'
      OR (visibility = 'platform_admin_only' AND public.has_audience(auth.uid(), 'admin'))
      OR (visibility = 'public_event' AND public.has_audience(auth.uid(), 'admin'))
      OR (visibility IN ('team','student_team','family_team')
          AND student_id IS NOT NULL
          AND public.can_access_student(auth.uid(), student_id))
      OR (visibility IN ('school_team','district_team','partner_only')
          AND related_organization_id IS NOT NULL
          AND public.is_org_member(auth.uid(), related_organization_id))
    )
  );

CREATE POLICY calendar_events_update ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND (
      visibility = 'private'
      OR (visibility = 'platform_admin_only' AND public.has_audience(auth.uid(), 'admin'))
      OR (visibility = 'public_event' AND public.has_audience(auth.uid(), 'admin'))
      OR (visibility IN ('team','student_team','family_team')
          AND student_id IS NOT NULL
          AND public.can_access_student(auth.uid(), student_id))
      OR (visibility IN ('school_team','district_team','partner_only')
          AND related_organization_id IS NOT NULL
          AND public.is_org_member(auth.uid(), related_organization_id))
    )
  );

CREATE POLICY calendar_events_delete ON public.calendar_events
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
