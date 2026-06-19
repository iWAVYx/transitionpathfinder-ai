-- Re-assert column-level REVOKEs for partner PII. These were originally
-- applied in migration 20260608065857; re-applying is idempotent and
-- guarantees the restriction survives any schema-push that re-grants
-- table-level SELECT to authenticated/anon.
REVOKE SELECT (contact_email, phone, address, outreach_status, outreach_notes, admin_notes, next_follow_up_date)
  ON public.partner_organizations FROM authenticated, anon;

REVOKE SELECT (contact_email)
  ON public.partner_network_opportunities FROM authenticated, anon;