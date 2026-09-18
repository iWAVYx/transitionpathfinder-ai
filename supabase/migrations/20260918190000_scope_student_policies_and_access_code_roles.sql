-- Defense-in-depth alignment for the 2026-09-18 Lovable security rescan.
--
-- Existing table grants already keep anonymous users out of these sensitive
-- tables, and access-code writes already go through a validated server-side
-- function. This migration makes both boundaries explicit at the database
-- object level so a future grant or helper change cannot silently widen them.

BEGIN;

-- The replacement evidence policies introduced by the counselor-scope work
-- inherited PostgreSQL's PUBLIC policy role because they omitted TO. Keep the
-- existing predicates unchanged and narrow only the policy roles.
ALTER POLICY "evidence_items view scoped by permission_scope"
  ON public.evidence_items TO authenticated;
ALTER POLICY "evidence_items insert scoped"
  ON public.evidence_items TO authenticated;
ALTER POLICY "evidence_items update scoped"
  ON public.evidence_items TO authenticated;

-- These two update paths are intentionally separate: editors manage pending
-- relationships, while the related user approves their own consent. Both are
-- signed-in operations and must never be reachable through PUBLIC/anon.
ALTER POLICY "Editors update relationships"
  ON public.student_relationships TO authenticated;
ALTER POLICY "Related user approves own consent"
  ON public.student_relationships TO authenticated;

-- Access-code issuance already rejects unsupported roles and direct browser
-- writes are revoked. Add a table constraint as an independent final barrier.
-- Legacy aliases remain valid because existing pilot codes normalize them to
-- their current account roles during redemption.
ALTER TABLE public.access_codes
  ADD CONSTRAINT access_codes_role_allowlist_check
  CHECK (
    role = ANY (ARRAY[
      'student',
      'family',
      'parent',
      'guardian',
      'educator',
      'teacher',
      'case_manager',
      'counselor',
      'school_admin',
      'district_admin'
    ]::text[])
  ) NOT VALID;

-- Fail closed if an existing row contains an unsupported or elevated role.
-- The transaction will roll back without changing any policy in that case.
ALTER TABLE public.access_codes
  VALIDATE CONSTRAINT access_codes_role_allowlist_check;

COMMENT ON CONSTRAINT access_codes_role_allowlist_check ON public.access_codes IS
  'Only reviewed school/district license roles and their legacy aliases may be redeemed; platform roles are never valid access-code targets.';

-- Stop-on-error catalog verification. This checks the applied state rather
-- than trusting the migration text alone.
DO $verify_authz_defense_in_depth$
DECLARE
  v_authenticated_oid oid := 'authenticated'::regrole::oid;
  v_expected_policy_count integer;
  v_constraint_validated boolean;
BEGIN
  SELECT count(*)
  INTO v_expected_policy_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (
      (c.relname = 'evidence_items' AND p.polname IN (
        'evidence_items view scoped by permission_scope',
        'evidence_items insert scoped',
        'evidence_items update scoped'
      ))
      OR
      (c.relname = 'student_relationships' AND p.polname IN (
        'Editors update relationships',
        'Related user approves own consent'
      ))
    )
    AND p.polroles = ARRAY[v_authenticated_oid]::oid[];

  IF v_expected_policy_count <> 5 THEN
    RAISE EXCEPTION
      'Expected 5 sensitive policies scoped only to authenticated; found %',
      v_expected_policy_count;
  END IF;

  SELECT convalidated
  INTO v_constraint_validated
  FROM pg_constraint
  WHERE conrelid = 'public.access_codes'::regclass
    AND conname = 'access_codes_role_allowlist_check';

  IF v_constraint_validated IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'access_codes role allowlist is missing or unvalidated';
  END IF;
END;
$verify_authz_defense_in_depth$;

COMMIT;
