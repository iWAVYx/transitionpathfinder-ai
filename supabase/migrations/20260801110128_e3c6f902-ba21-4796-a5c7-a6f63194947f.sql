
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS coverage_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS coverage_state_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS export_window_ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_coverage_state_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_coverage_state_check
      CHECK (coverage_state IN ('active','graduated','transferred','archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_coverage_state ON public.students(coverage_state);

CREATE OR REPLACE FUNCTION public.set_student_coverage_state(
  _student_id uuid,
  _state text,
  _reason text,
  _export_window_days integer DEFAULT 180,
  _to_organization_id uuid DEFAULT NULL
)
RETURNS TABLE(coverage_state text, export_window_ends_at timestamptz, released_allocations integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _before jsonb;
  _org uuid;
  _released integer := 0;
  _window timestamptz;
  _alloc record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _state NOT IN ('active','graduated','transferred','archived') THEN
    RAISE EXCEPTION 'Invalid coverage state';
  END IF;
  IF coalesce(length(btrim(_reason)), 0) < 10 THEN
    RAISE EXCEPTION 'A reason of at least 10 characters is required';
  END IF;
  IF NOT public.can_edit_student(auth.uid(), _student_id) THEN
    RAISE EXCEPTION 'Not authorized for this student';
  END IF;

  SELECT to_jsonb(s) - 'notes', s.organization_id
    INTO _before, _org
  FROM public.students s
  WHERE s.id = _student_id;

  IF _before IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF _state IN ('graduated','archived') THEN
    _window := now() + make_interval(days => greatest(coalesce(_export_window_days, 180), 30));
  ELSE
    _window := NULL;
  END IF;

  UPDATE public.students s
     SET coverage_state = _state,
         coverage_state_changed_at = now(),
         export_window_ends_at = _window,
         organization_id = CASE
           WHEN _state = 'transferred' AND _to_organization_id IS NOT NULL
             THEN _to_organization_id ELSE s.organization_id END,
         updated_at = now()
   WHERE s.id = _student_id;

  IF _state IN ('graduated','archived') THEN
    FOR _alloc IN
      SELECT id, license_type, sponsor_organization_id, pool_id, beneficiary_user_id
        FROM public.license_allocations
       WHERE student_id = _student_id
         AND license_type = 'pathway'
         AND state IN ('reserved','active')
       FOR UPDATE
    LOOP
      UPDATE public.license_allocations
         SET state = 'expired',
             revoked_at = now(),
             revoked_reason = left(_reason, 500)
       WHERE id = _alloc.id;
      _released := _released + 1;

      PERFORM public.record_entitlement_audit(
        'license_released_coverage_state',
        _reason,
        _alloc.sponsor_organization_id,
        _alloc.beneficiary_user_id,
        _alloc.license_type,
        _alloc.id,
        _alloc.pool_id,
        jsonb_build_object('state','active'),
        jsonb_build_object('state','expired','coverage_state',_state)
      );
    END LOOP;
  END IF;

  PERFORM public.record_entitlement_audit(
    'student_coverage_state_changed',
    _reason,
    coalesce(_to_organization_id, _org),
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('coverage_state', _before->>'coverage_state'),
    jsonb_build_object('coverage_state', _state, 'export_window_ends_at', _window)
  );

  RETURN QUERY SELECT _state, _window, _released;
END;
$$;

REVOKE ALL ON FUNCTION public.set_student_coverage_state(uuid, text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_coverage_state(uuid, text, text, integer, uuid) TO authenticated;
