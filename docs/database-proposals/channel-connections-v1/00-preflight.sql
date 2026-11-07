-- REVIEW-ONLY read-only inventory. Not executed in this checkpoint.
-- Run only in a separately authorized staging inspection, never infer ledger
-- application or data readiness from local migration files alone.
BEGIN READ ONLY;
SELECT current_setting('server_version_num') AS server_version_num;
SELECT current_user, session_user, current_setting('row_security') AS row_security;
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user;
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_schema = 'public' AND table_name IN (
  'partner_organizations', 'organizations', 'organization_memberships',
  'channel_connection_requests', 'channels', 'channel_members', 'user_roles'
)) ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS relation, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid IN (
  'public.channel_connection_requests'::regclass,
  'public.channel_members'::regclass, 'public.organizations'::regclass
) ORDER BY conrelid::regclass::text, conname;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
  'channel_connection_requests', 'channel_members', 'channels', 'organization_memberships'
) ORDER BY tablename, policyname;
SELECT c.oid::regclass AS relation, pg_get_userbyid(c.relowner) AS table_owner, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('channels','channel_connection_requests');
SELECT t.tgname, c.relname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  AND c.relname IN ('channels','channel_connection_requests','organization_memberships','user_roles')
  AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name IN (
  'channel_connection_requests', 'channels', 'channel_members'
) ORDER BY table_name, grantee, privilege_type;
SELECT table_name, grantee, column_name, privilege_type
FROM information_schema.column_privileges WHERE table_schema = 'public'
  AND table_name IN ('channel_connection_requests', 'channel_members')
ORDER BY table_name, grantee, column_name, privilege_type;

SELECT status::text, count(*) AS request_count,
  count(*) FILTER (WHERE expires_at <= clock_timestamp()) AS past_expiry,
  count(*) FILTER (WHERE resulting_channel_id IS NULL) AS without_channel_link,
  count(*) FILTER (WHERE requester_id = responded_by) AS self_responses
FROM public.channel_connection_requests GROUP BY status ORDER BY status::text;
SELECT count(*) AS pending_context_groups_with_duplicates FROM (
  SELECT 1 FROM public.channel_connection_requests WHERE status = 'pending'
  GROUP BY requester_id, target_partner_organization_id, requester_organization_id, purpose_category
  HAVING count(*) > 1
) duplicates;
SELECT count(*) AS accepted_with_missing_or_mismatched_channel
FROM public.channel_connection_requests r LEFT JOIN public.channels c ON c.id = r.resulting_channel_id
WHERE r.status = 'accepted' AND (c.id IS NULL OR c.created_by IS DISTINCT FROM r.responded_by
  OR c.partner_organization_id IS DISTINCT FROM r.target_partner_organization_id
  OR c.organization_id IS DISTINCT FROM r.requester_organization_id);
SELECT count(*) AS accepted_without_both_original_active_participants
FROM public.channel_connection_requests r WHERE r.status = 'accepted' AND (
  NOT EXISTS (SELECT 1 FROM public.channel_members m WHERE m.channel_id = r.resulting_channel_id
    AND m.user_id = r.requester_id AND m.left_at IS NULL)
  OR NOT EXISTS (SELECT 1 FROM public.channel_members m WHERE m.channel_id = r.resulting_channel_id
    AND m.user_id = r.responded_by AND m.left_at IS NULL)
);
-- These are review cohorts, not instructions to add/remove a member.
SELECT o.type, o.verified_status, m.role_within_org, m.status, count(*) AS memberships
FROM public.organization_memberships m JOIN public.organizations o ON o.id = m.organization_id
GROUP BY o.type, o.verified_status, m.role_within_org, m.status
ORDER BY o.type, o.verified_status, m.role_within_org, m.status;
SELECT role::text, count(*) AS role_rows FROM public.user_roles GROUP BY role ORDER BY role::text;
SELECT count(*) AS eligible_profile_label_without_recorded_eligible_role
FROM public.profiles p WHERE p.primary_role IN (
  'teacher', 'educator', 'case_manager', 'school_admin', 'district_admin', 'partner'
) AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id
  AND r.role::text IN ('teacher','educator','case_manager','school_admin','district_admin','partner'));
ROLLBACK;
