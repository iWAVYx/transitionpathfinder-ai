-- REVIEW ARTIFACT ONLY. Current application wrappers still use direct writes.
-- DO NOT APPLY. No client/protocol compatibility acceptance has been completed.
BEGIN;
DO $$ BEGIN RAISE EXCEPTION 'Review-only cutover: current clients are not migrated'; END $$;

-- Require separately evidenced schema/catalog/legacy-cohort review, exact-build
-- wrappers and UI for every role, rollback-only DB/concurrency tests, and a
-- bounded explicit staging application authorization before deriving a migration.
REVOKE INSERT, UPDATE, DELETE ON public.channel_connection_requests FROM authenticated;
-- Audit and revoke any column-level write grants too; a table REVOKE alone is
-- insufficient if later migrations granted individual columns. Preflight first.
REVOKE INSERT (id,requester_id,requester_organization_id,target_partner_organization_id,
  purpose_category,message,proposed_next_step,status,responded_by,responded_at,resulting_channel_id,
  expires_at,created_at,updated_at,directory_partner_id,directory_link_version,receiver_consent_version,
  client_request_key,client_payload,protocol_version,setup_completed_at,revision)
  ON public.channel_connection_requests FROM authenticated;
REVOKE UPDATE (id,requester_id,requester_organization_id,target_partner_organization_id,
  purpose_category,message,proposed_next_step,status,responded_by,responded_at,resulting_channel_id,
  expires_at,created_at,updated_at,directory_partner_id,directory_link_version,receiver_consent_version,
  client_request_key,client_payload,protocol_version,setup_completed_at,revision)
  ON public.channel_connection_requests FROM authenticated;
DROP POLICY IF EXISTS "Authenticated users create requests" ON public.channel_connection_requests;
DROP POLICY IF EXISTS "Requester withdraws; target-org admins respond" ON public.channel_connection_requests;
-- SELECT and unrelated channel/student-history policies remain unchanged.
-- Both remain disabled until an approved cutover deliberately changes them.
UPDATE tf_connection_private.control SET protocol_ready=false,creation_enabled=false WHERE singleton;

ROLLBACK;
