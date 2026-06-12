
UPDATE public.system_health_checks
SET status = 'working',
    notes = 'Cross-district RLS regression verified via tests/cross-district-rls.test.mjs (8 cases: in-scope reads, out-of-scope reads return zero, cross-district UPDATE/DELETE denied, symmetric isolation, stranger denial). CI: .github/workflows/cross-district-rls-qa.yml.',
    action_needed = NULL,
    updated_at = now()
WHERE key = 'flow_district_boundary';
