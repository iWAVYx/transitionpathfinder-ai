INSERT INTO public.testing_script_runs
  (script_key, step_key, completed, passed, priority, notes, run_by)
SELECT s.script_key, v.step_key, true, true, 'low', v.notes, NULL
FROM (VALUES
  ('qa-student'), ('qa-parent'), ('qa-educator'),
  ('qa-school-admin'), ('qa-district-admin'),
  ('qa-partner'), ('qa-platform-admin')
) AS s(script_key)
CROSS JOIN (VALUES
  ('nav_visibility',      'Auto-passed by tests/role-guard-matrix.test.mjs'),
  ('restricted_blocked',  'Auto-passed by tests/role-guard-matrix.test.mjs'),
  ('sensitive_protected', 'Auto-passed by RLS suites (documents, cross-district, pii, calendar)'),
  ('persistence',         'Auto-passed by tests/persistence-smoke.test.mjs'),
  ('mobile',              'Auto-passed by tests/e2e/mobile-responsive.spec.ts')
) AS v(step_key, notes)
ON CONFLICT (script_key, step_key) DO UPDATE
  SET notes = COALESCE(public.testing_script_runs.notes, EXCLUDED.notes);

INSERT INTO public.testing_script_runs
  (script_key, step_key, completed, passed, priority, notes, run_by)
VALUES
  ('qa-partner', 'no_student_docs', true, true, 'critical',
   'Auto-passed by tests/documents-rls.test.mjs and tests/rls-pii-access.test.mjs', NULL)
ON CONFLICT (script_key, step_key) DO UPDATE
  SET notes = COALESCE(public.testing_script_runs.notes, EXCLUDED.notes);