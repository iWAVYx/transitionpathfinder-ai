-- REVIEW ARTIFACT ONLY. Not a migration. Never run against an application DB.
-- A promoted, authorized migration must be derived after schema/data review.
BEGIN;
DO $$ BEGIN RAISE EXCEPTION 'Review-only connection proposal: execution is blocked'; END $$;

CREATE SCHEMA tf_connection_private;
REVOKE ALL ON SCHEMA tf_connection_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE tf_connection_private.control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  protocol_ready boolean NOT NULL DEFAULT false,
  creation_enabled boolean NOT NULL DEFAULT false,
  CHECK (NOT creation_enabled OR protocol_ready)
);
INSERT INTO tf_connection_private.control DEFAULT VALUES;

-- One current workspace per directory listing; several explicitly reviewed
-- listings may share a workspace. Evidence and reviewer identity stay private.
CREATE TABLE tf_connection_private.directory_links (
  directory_partner_id uuid PRIMARY KEY REFERENCES public.partner_organizations(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  state text NOT NULL CHECK (state IN ('active', 'suspended')),
  reviewed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  evidence_reference text NOT NULL CHECK (char_length(btrim(evidence_reference)) BETWEEN 1 AND 500)
);
CREATE TABLE tf_connection_private.receiving_preferences (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.channel_connection_requests
  ADD COLUMN directory_partner_id uuid REFERENCES public.partner_organizations(id) ON DELETE RESTRICT,
  ADD COLUMN directory_link_version bigint,
  ADD COLUMN receiver_consent_version bigint,
  ADD COLUMN client_request_key uuid,
  ADD COLUMN client_payload jsonb,
  ADD COLUMN protocol_version smallint,
  ADD COLUMN setup_completed_at timestamptz,
  ADD COLUMN revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  ADD CONSTRAINT connection_v1_attribution CHECK (
    protocol_version IS NULL OR (
      protocol_version = 1 AND revision > 0 AND directory_partner_id IS NOT NULL
      AND requester_organization_id IS NOT NULL
      AND directory_link_version > 0 AND directory_link_version IS NOT NULL
      AND receiver_consent_version > 0 AND receiver_consent_version IS NOT NULL
      AND client_request_key IS NOT NULL AND client_payload IS NOT NULL
      AND jsonb_typeof(client_payload) = 'object'
    )
  );
ALTER TABLE public.channel_connection_requests ADD CONSTRAINT connection_v1_completed_setup CHECK (
  setup_completed_at IS NULL OR (protocol_version = 1 AND protocol_version IS NOT NULL
    AND status = 'accepted' AND resulting_channel_id IS NOT NULL
    AND responded_by IS NOT NULL AND responded_at IS NOT NULL)
);
ALTER TABLE public.channel_connection_requests ADD CONSTRAINT connection_v1_acceptance_marker CHECK (
  protocol_version IS DISTINCT FROM 1 OR status <> 'accepted' OR setup_completed_at IS NOT NULL
);
-- Seal new attribution during the additive phase while old v0 clients still
-- have their legacy table grants. Trusted RPC owners bypass these RLS checks;
-- their exact ownership/bypass configuration must be verified before any apply.
CREATE POLICY tf_connection_v1_insert_sealed ON public.channel_connection_requests
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
    protocol_version IS NULL AND directory_partner_id IS NULL AND directory_link_version IS NULL
    AND receiver_consent_version IS NULL AND client_request_key IS NULL AND client_payload IS NULL
    AND setup_completed_at IS NULL AND revision=0
  );
CREATE POLICY tf_connection_v1_update_sealed ON public.channel_connection_requests
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (protocol_version IS NULL) WITH CHECK (
    protocol_version IS NULL AND directory_partner_id IS NULL AND directory_link_version IS NULL
    AND receiver_consent_version IS NULL AND client_request_key IS NULL AND client_payload IS NULL
    AND setup_completed_at IS NULL AND revision=0
  );
CREATE POLICY tf_connection_v1_delete_sealed ON public.channel_connection_requests
  AS RESTRICTIVE FOR DELETE TO authenticated USING (protocol_version IS NULL);
CREATE POLICY tf_connection_v1_read_scope ON public.channel_connection_requests
  AS RESTRICTIVE FOR SELECT TO authenticated USING (
    protocol_version IS DISTINCT FROM 1 OR requester_id=auth.uid() OR public.is_platform_admin(auth.uid())
    OR (EXISTS (SELECT 1 FROM public.organization_memberships m
      WHERE m.organization_id=target_partner_organization_id AND m.user_id=auth.uid()
        AND m.status='active' AND m.role_within_org IN ('owner','admin'))
      AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role::text='partner'))
  );
CREATE UNIQUE INDEX connection_v1_actor_key
  ON public.channel_connection_requests(requester_id, client_request_key)
  WHERE protocol_version = 1;
-- Expiry is resolved explicitly under the protocol lock, never in a volatile
-- partial-index predicate. This index is not applied to unreviewed legacy data.
CREATE UNIQUE INDEX connection_v1_pending_context
  ON public.channel_connection_requests(
    requester_id, target_partner_organization_id, requester_organization_id, purpose_category
  ) WHERE protocol_version = 1 AND status = 'pending';

ALTER TABLE public.channels ADD COLUMN connection_request_id uuid
  UNIQUE REFERENCES public.channel_connection_requests(id) ON DELETE RESTRICT;

CREATE POLICY tf_connection_binding_insert_sealed ON public.channels
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (connection_request_id IS NULL);

CREATE TABLE tf_connection_private.operation_keys (
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operation_key uuid NOT NULL,
  request_id uuid NOT NULL REFERENCES public.channel_connection_requests(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor_id, operation_key)
);
CREATE TABLE tf_connection_private.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'link_reviewed', 'receiving_consent_changed', 'request_created',
    'request_expired', 'request_accepted', 'request_declined', 'request_withdrawn'
  )),
  request_id uuid REFERENCES public.channel_connection_requests(id) ON DELETE RESTRICT,
  directory_partner_id uuid REFERENCES public.partner_organizations(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- No authenticated or service-role table access to internal state/evidence.
-- Review deletion/retention requirements before introducing RESTRICT FKs.
ALTER TABLE tf_connection_private.control ENABLE ROW LEVEL SECURITY;
ALTER TABLE tf_connection_private.directory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tf_connection_private.receiving_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tf_connection_private.operation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tf_connection_private.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA tf_connection_private FROM PUBLIC, anon, authenticated, service_role;

ROLLBACK; -- A second execution barrier. This is never a deployment artifact.
