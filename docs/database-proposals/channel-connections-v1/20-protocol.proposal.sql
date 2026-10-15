-- REVIEW ARTIFACT ONLY. Derive an authorized migration after independent review.
-- Requires the separate schema proposal. No environment or service key inputs.
BEGIN;
DO $$ BEGIN RAISE EXCEPTION 'Review-only connection proposal: execution is blocked'; END $$;

-- A single short transaction lock is a deliberate first-version throughput
-- tradeoff. No network, provider, email, AI or storage operation belongs here.
-- Existing set_updated_at uses transaction-start time. A v1-specific stamp
-- runs after that known trigger; revision, never timestamp, is the CAS authority.
CREATE FUNCTION tf_connection_private.stamp_request_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER zz_tf_connection_v1_stamp BEFORE UPDATE ON public.channel_connection_requests
  FOR EACH ROW WHEN (NEW.protocol_version=1)
  EXECUTE FUNCTION tf_connection_private.stamp_request_v1();

-- The old channels table has broad UPDATE grants. Preserve legitimate title/
-- archive changes but seal the new binding unless the effective writer owns
-- the table (the reviewed definer owner or an authorized DB maintenance role).
CREATE FUNCTION tf_connection_private.guard_channel_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.connection_request_id IS NULL THEN RETURN NEW; END IF;
  ELSIF NEW.connection_request_id IS NOT DISTINCT FROM OLD.connection_request_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_roles r ON r.oid=c.relowner
    WHERE n.nspname='public' AND c.relname='channels' AND r.rolname=current_user) THEN
    RAISE EXCEPTION 'Connection binding is managed by the protocol' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tf_connection_channel_binding BEFORE INSERT OR UPDATE OF connection_request_id
  ON public.channels FOR EACH ROW EXECUTE FUNCTION tf_connection_private.guard_channel_binding();

CREATE FUNCTION tf_connection_private.lock_protocol(p_require_ready boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tf:connection-protocol:v1', 0));
  IF p_require_ready AND NOT EXISTS (
    SELECT 1 FROM tf_connection_private.control WHERE singleton AND protocol_ready
  ) THEN RAISE EXCEPTION 'Connection protocol is unavailable' USING ERRCODE = '55000'; END IF;
END;
$$;
CREATE FUNCTION tf_connection_private.clean(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT pg_catalog.regexp_replace(COALESCE(p_value, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
$$;
CREATE FUNCTION tf_connection_private.require_owner(p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.admin_roles WHERE user_id = p_actor
    AND role::text IN ('platform_owner', 'platform_admin') ORDER BY id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner Hub access required' USING ERRCODE = '42501'; END IF;
END;
$$;
CREATE FUNCTION tf_connection_private.require_actor(p_actor uuid, p_organization uuid, p_admin boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org record; v_member record; v_allowed boolean;
BEGIN
  IF p_actor IS NULL OR p_organization IS NULL THEN
    RAISE EXCEPTION 'A verified organization context is required' USING ERRCODE = '42501';
  END IF;
  IF public.is_platform_admin(p_actor) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_actor AND role::text = 'admin'
  ) THEN RAISE EXCEPTION 'Use Owner Hub for management' USING ERRCODE = '42501'; END IF;
  -- Display-only profiles.primary_role is intentionally not an authority source.
  PERFORM 1 FROM public.user_roles WHERE user_id = p_actor ORDER BY id FOR SHARE;
  SELECT id, type, verified_status INTO v_org FROM public.organizations
    WHERE id = p_organization FOR SHARE;
  IF NOT FOUND OR v_org.verified_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Organization context is unavailable' USING ERRCODE = '42501';
  END IF;
  SELECT id, role_within_org, status INTO v_member FROM public.organization_memberships
    WHERE organization_id = p_organization AND user_id = p_actor FOR SHARE;
  IF NOT FOUND OR v_member.status IS DISTINCT FROM 'active' OR
     (p_admin AND v_member.role_within_org NOT IN ('admin', 'owner')) THEN
    RAISE EXCEPTION 'Current organization access is required' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_actor AND (
    (r.role::text IN ('teacher','educator','case_manager') AND v_org.type IN ('school','district'))
    OR (r.role::text = 'school_admin' AND v_org.type = 'school')
    OR (r.role::text = 'district_admin' AND v_org.type = 'district')
    OR (r.role::text = 'partner' AND v_org.type IN ('partner','agency'))
  )) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Recorded role does not support this context' USING ERRCODE = '42501'; END IF;
END;
$$;
CREATE FUNCTION tf_connection_private.live_target(p_directory uuid, p_link_version bigint, p_consent_version bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link record; v_dir record; v_org record; v_pref record;
BEGIN
  SELECT * INTO v_link FROM tf_connection_private.directory_links
    WHERE directory_partner_id = p_directory FOR SHARE;
  IF NOT FOUND OR v_link.state IS DISTINCT FROM 'active' OR v_link.version IS DISTINCT FROM p_link_version THEN
    RAISE EXCEPTION 'Partner link changed or is unavailable' USING ERRCODE = '40001';
  END IF;
  SELECT id, organization_name, is_public, verification_status INTO v_dir
    FROM public.partner_organizations WHERE id = p_directory FOR SHARE;
  IF NOT FOUND OR NOT v_dir.is_public OR v_dir.verification_status::text NOT IN ('verified','featured') THEN
    RAISE EXCEPTION 'Directory partner is unavailable' USING ERRCODE = '42501';
  END IF;
  SELECT id, name, type, verified_status INTO v_org FROM public.organizations
    WHERE id = v_link.organization_id FOR UPDATE;
  IF NOT FOUND OR v_org.type NOT IN ('partner','agency') OR v_org.verified_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Receiving workspace is unavailable' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_pref FROM tf_connection_private.receiving_preferences
    WHERE organization_id = v_org.id FOR SHARE;
  IF NOT FOUND OR NOT v_pref.enabled OR v_pref.version IS DISTINCT FROM p_consent_version THEN
    RAISE EXCEPTION 'Receiving consent changed or is unavailable' USING ERRCODE = '40001';
  END IF;
  RETURN pg_catalog.jsonb_build_object('organization_id',v_org.id,'organization_name',v_org.name,
    'directory_partner_id',p_directory,'directory_name',v_dir.organization_name,
    'link_version',v_link.version,'consent_version',v_pref.version);
END;
$$;
CREATE FUNCTION tf_connection_private.outcome(p_request uuid, p_viewer uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_req record; v_channel record; v_open boolean := false; v_channel_state text := 'unavailable'; v_setup text;
BEGIN
  SELECT * INTO v_req FROM public.channel_connection_requests WHERE id = p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable' USING ERRCODE = '42501'; END IF;
  v_setup := CASE WHEN v_req.status = 'accepted' THEN
    CASE WHEN v_req.protocol_version IS DISTINCT FROM 1 THEN 'legacy_review'
         WHEN v_req.setup_completed_at IS NULL THEN 'incomplete' ELSE 'complete' END
    WHEN v_req.status = 'pending' THEN 'not_started' ELSE 'not_applicable' END;
  IF v_req.status = 'accepted' AND v_req.setup_completed_at IS NOT NULL THEN
    SELECT * INTO v_channel FROM public.channels WHERE id = v_req.resulting_channel_id
      AND connection_request_id = v_req.id AND created_by = v_req.responded_by
      AND partner_organization_id = v_req.target_partner_organization_id
      AND organization_id IS NOT DISTINCT FROM v_req.requester_organization_id
      AND student_id IS NULL AND kind = 'partner_outreach';
    IF FOUND AND public.is_channel_member(p_viewer,v_channel.id) THEN
      v_open := true;
      v_channel_state := CASE WHEN v_channel.archived_at IS NULL THEN 'active' ELSE 'archived' END;
    END IF;
  END IF;
  RETURN pg_catalog.jsonb_build_object('request_id',v_req.id,'status',v_req.status,
    'requester_id',v_req.requester_id,'requester_organization_id',v_req.requester_organization_id,
    'target_organization_id',v_req.target_partner_organization_id,'expires_at',v_req.expires_at,
    'updated_at',v_req.updated_at,'revision',v_req.revision,
    'directory_partner_id',v_req.directory_partner_id,'directory_link_version',v_req.directory_link_version,
    'receiver_consent_version',v_req.receiver_consent_version,
    'saved_fields',pg_catalog.jsonb_build_object('purpose',v_req.purpose_category,'message',v_req.message,'next_step',v_req.proposed_next_step),'setup_state',v_setup,'channel_id',v_req.resulting_channel_id,
    'channel_state',v_channel_state,'can_open_channel',v_open);
END;
$$;
CREATE FUNCTION tf_connection_private.claim_operation(p_actor uuid,p_key uuid,p_request uuid,p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_existing record;
BEGIN
  IF p_key IS NULL THEN RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_existing FROM tf_connection_private.operation_keys
    WHERE actor_id = p_actor AND operation_key = p_key;
  IF FOUND THEN
    IF v_existing.request_id IS DISTINCT FROM p_request OR v_existing.payload IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'Operation key belongs to different intent' USING ERRCODE = '22023';
    END IF;
  ELSE
    INSERT INTO tf_connection_private.operation_keys(actor_id,operation_key,request_id,payload)
      VALUES(p_actor,p_key,p_request,p_payload);
  END IF;
END;
$$;

CREATE FUNCTION public.tf_connection_link_v1(p_directory uuid,p_organization uuid,p_expected_version bigint,p_state text,p_evidence_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_actor uuid := auth.uid(); v_existing record; v_version bigint;
BEGIN
  PERFORM tf_connection_private.lock_protocol(false);
  PERFORM tf_connection_private.require_owner(v_actor);
  IF p_directory IS NULL OR p_organization IS NULL OR p_expected_version IS NULL OR p_expected_version < 0
     OR p_state IS NULL OR p_state NOT IN ('active','suspended')
     OR pg_catalog.char_length(tf_connection_private.clean(p_evidence_reference)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Explicit mapping evidence and version are required' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.partner_organizations WHERE id = p_directory FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Directory entry unavailable'; END IF;
  -- Suspension must remain possible after the current workspace loses verification/type eligibility.
  PERFORM 1 FROM public.organizations o WHERE o.id = p_organization AND (
    (o.type IN ('partner','agency') AND o.verified_status = 'verified') OR
    (p_state='suspended' AND EXISTS (SELECT 1 FROM tf_connection_private.directory_links l
      WHERE l.directory_partner_id=p_directory AND l.organization_id=o.id))
  ) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verified receiving workspace required'; END IF;
  SELECT * INTO v_existing FROM tf_connection_private.directory_links WHERE directory_partner_id = p_directory FOR UPDATE;
  IF FOUND THEN
    IF v_existing.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Mapping changed' USING ERRCODE = '40001'; END IF;
    UPDATE tf_connection_private.directory_links SET organization_id=p_organization,state=p_state,
      version=version+1,reviewed_by=v_actor,reviewed_at=pg_catalog.clock_timestamp(),
      evidence_reference=tf_connection_private.clean(p_evidence_reference)
      WHERE directory_partner_id=p_directory RETURNING version INTO v_version;
  ELSE
    IF p_expected_version <> 0 THEN RAISE EXCEPTION 'Mapping changed' USING ERRCODE = '40001'; END IF;
    INSERT INTO tf_connection_private.directory_links(directory_partner_id,organization_id,state,reviewed_by,evidence_reference)
      VALUES(p_directory,p_organization,p_state,v_actor,tf_connection_private.clean(p_evidence_reference)) RETURNING version INTO v_version;
  END IF;
  INSERT INTO tf_connection_private.events(actor_id,event_type,directory_partner_id,organization_id,metadata)
    VALUES(v_actor,'link_reviewed',p_directory,p_organization,pg_catalog.jsonb_build_object('version',v_version,'state',p_state));
  RETURN pg_catalog.jsonb_build_object('directory_partner_id',p_directory,'organization_id',p_organization,'version',v_version,'state',p_state);
END;
$$;
CREATE FUNCTION public.tf_connection_consent_v1(p_organization uuid,p_expected_version bigint,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_actor uuid := auth.uid(); v_existing record; v_version bigint;
BEGIN
  PERFORM tf_connection_private.lock_protocol(false);
  PERFORM tf_connection_private.require_actor(v_actor,p_organization,true);
  PERFORM 1 FROM public.organizations WHERE id=p_organization AND type IN ('partner','agency');
  IF NOT FOUND OR p_enabled IS NULL OR p_expected_version IS NULL OR p_expected_version < 0 THEN RAISE EXCEPTION 'Receiving workspace consent is unavailable'; END IF;
  SELECT * INTO v_existing FROM tf_connection_private.receiving_preferences WHERE organization_id=p_organization FOR UPDATE;
  IF FOUND THEN
    IF v_existing.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Consent changed' USING ERRCODE = '40001'; END IF;
    IF v_existing.enabled = p_enabled THEN RETURN pg_catalog.jsonb_build_object('organization_id',p_organization,'version',v_existing.version,'enabled',v_existing.enabled); END IF;
    UPDATE tf_connection_private.receiving_preferences SET enabled=p_enabled,version=version+1,
      changed_by=v_actor,changed_at=pg_catalog.clock_timestamp() WHERE organization_id=p_organization RETURNING version INTO v_version;
  ELSE
    IF p_expected_version <> 0 THEN RAISE EXCEPTION 'Consent changed' USING ERRCODE = '40001'; END IF;
    INSERT INTO tf_connection_private.receiving_preferences(organization_id,enabled,changed_by)
      VALUES(p_organization,p_enabled,v_actor) RETURNING version INTO v_version;
  END IF;
  INSERT INTO tf_connection_private.events(actor_id,event_type,organization_id,metadata)
    VALUES(v_actor,'receiving_consent_changed',p_organization,pg_catalog.jsonb_build_object('version',v_version,'enabled',p_enabled));
  RETURN pg_catalog.jsonb_build_object('organization_id',p_organization,'version',v_version,'enabled',p_enabled);
END;
$$;
-- Read-back endpoints let management recover from an uncertain CAS save without
-- blindly repeating a mapping or consent change. They do not expose evidence publicly.
CREATE FUNCTION public.tf_connection_link_state_v1(p_directory uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_link record;
BEGIN
  PERFORM tf_connection_private.lock_protocol(false);
  PERFORM tf_connection_private.require_owner(v_actor);
  SELECT * INTO v_link FROM tf_connection_private.directory_links WHERE directory_partner_id=p_directory;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('found',false); END IF;
  RETURN pg_catalog.jsonb_build_object('found',true,'link',pg_catalog.to_jsonb(v_link));
END;
$$;
CREATE FUNCTION public.tf_connection_consent_state_v1(p_organization uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_pref record;
BEGIN
  PERFORM tf_connection_private.lock_protocol(false);
  PERFORM tf_connection_private.require_actor(v_actor,p_organization,true);
  PERFORM 1 FROM public.organizations WHERE id=p_organization AND type IN ('partner','agency');
  IF NOT FOUND THEN RAISE EXCEPTION 'Receiving workspace unavailable'; END IF;
  SELECT * INTO v_pref FROM tf_connection_private.receiving_preferences WHERE organization_id=p_organization;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('organization_id',p_organization,'version',0,'enabled',false); END IF;
  RETURN pg_catalog.jsonb_build_object('organization_id',p_organization,'version',v_pref.version,'enabled',v_pref.enabled,'changed_at',v_pref.changed_at);
END;
$$;
CREATE FUNCTION public.tf_connection_targets_v1(p_source_organization uuid,p_after uuid DEFAULT NULL,p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_rows jsonb; v_next uuid;
BEGIN
  PERFORM tf_connection_private.lock_protocol();
  PERFORM tf_connection_private.require_actor(v_actor,p_source_organization);
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid page size' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tf_connection_private.control WHERE singleton AND creation_enabled) THEN
    RETURN pg_catalog.jsonb_build_object('enabled',false,'targets','[]'::jsonb,'next_cursor',NULL);
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY t.directory_partner_id),'[]'::jsonb) INTO v_rows FROM (
    SELECT l.directory_partner_id,d.organization_name AS directory_name,o.id AS organization_id,
      o.name AS organization_name,l.version AS link_version,p.version AS consent_version
    FROM tf_connection_private.directory_links l JOIN public.partner_organizations d ON d.id=l.directory_partner_id
    JOIN public.organizations o ON o.id=l.organization_id
    JOIN tf_connection_private.receiving_preferences p ON p.organization_id=o.id
    WHERE l.state='active' AND d.is_public AND d.verification_status::text IN ('verified','featured')
      AND o.type IN ('partner','agency') AND o.verified_status='verified' AND p.enabled
      AND o.id <> p_source_organization AND (p_after IS NULL OR l.directory_partner_id > p_after)
    ORDER BY l.directory_partner_id LIMIT p_limit+1
  ) t;
  IF pg_catalog.jsonb_array_length(v_rows) > p_limit THEN
    v_next := (v_rows->(p_limit-1)->>'directory_partner_id')::uuid;
    SELECT pg_catalog.jsonb_agg(e.value ORDER BY e.ordinality) INTO v_rows
      FROM pg_catalog.jsonb_array_elements(v_rows) WITH ORDINALITY e(value,ordinality) WHERE e.ordinality <= p_limit;
  END IF;
  RETURN pg_catalog.jsonb_build_object('enabled',true,'targets',v_rows,'next_cursor',v_next);
END;
$$;
CREATE FUNCTION public.tf_connection_create_v1(p_directory uuid,p_link_version bigint,p_consent_version bigint,
  p_source_organization uuid,p_client_key uuid,p_purpose text,p_message text,p_next_step text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_actor uuid := auth.uid(); v_payload jsonb; v_existing record; v_target jsonb;
  v_target_id uuid; v_id uuid; v_now timestamptz; v_message text; v_next text;
BEGIN
  PERFORM tf_connection_private.lock_protocol();
  PERFORM tf_connection_private.require_actor(v_actor,p_source_organization);
  v_message := tf_connection_private.clean(p_message);
  v_next := NULLIF(tf_connection_private.clean(p_next_step),'');
  IF p_directory IS NULL OR p_client_key IS NULL OR p_link_version IS NULL OR p_link_version < 1
    OR p_consent_version IS NULL OR p_consent_version < 1 OR p_purpose IS NULL
    OR p_purpose NOT IN ('program_information','opportunity_discussion','referral_process','resource_exchange','other')
    OR pg_catalog.char_length(v_message) NOT BETWEEN 1 AND 4000 OR pg_catalog.char_length(COALESCE(v_next,'')) > 1000 THEN
    RAISE EXCEPTION 'Request fields are incomplete or invalid' USING ERRCODE='22023';
  END IF;
  v_payload := pg_catalog.jsonb_build_object('directory_partner_id',p_directory,'link_version',p_link_version,
    'consent_version',p_consent_version,'source_organization_id',p_source_organization,
    'purpose',p_purpose,'message',v_message,'next_step',v_next);
  SELECT * INTO v_existing FROM public.channel_connection_requests
    WHERE requester_id=v_actor AND client_request_key=p_client_key AND protocol_version=1 FOR UPDATE;
  IF FOUND THEN
    IF v_existing.client_payload IS DISTINCT FROM v_payload THEN RAISE EXCEPTION 'Request key belongs to different intent' USING ERRCODE='22023'; END IF;
    RETURN tf_connection_private.outcome(v_existing.id,v_actor);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tf_connection_private.control WHERE singleton AND creation_enabled) THEN RAISE EXCEPTION 'New requests are paused' USING ERRCODE='55000'; END IF;
  v_target := tf_connection_private.live_target(p_directory,p_link_version,p_consent_version);
  v_target_id := (v_target->>'organization_id')::uuid;
  IF v_target_id=p_source_organization OR EXISTS (SELECT 1 FROM public.organization_memberships
    WHERE organization_id=v_target_id AND user_id=v_actor AND status='active') THEN
    RAISE EXCEPTION 'Choose a workspace outside your own organization' USING ERRCODE='22023';
  END IF;
  v_now := pg_catalog.clock_timestamp();
  WITH expired AS (
    UPDATE public.channel_connection_requests SET status='expired',revision=revision+1
      WHERE protocol_version=1 AND requester_id=v_actor AND target_partner_organization_id=v_target_id
        AND requester_organization_id=p_source_organization AND purpose_category=p_purpose
        AND status='pending' AND expires_at <= v_now RETURNING id
  ) INSERT INTO tf_connection_private.events(actor_id,event_type,request_id)
      SELECT v_actor,'request_expired',id FROM expired;
  IF EXISTS (SELECT 1 FROM public.channel_connection_requests WHERE requester_id=v_actor
    AND target_partner_organization_id=v_target_id AND requester_organization_id=p_source_organization
    AND purpose_category=p_purpose AND status='pending' AND expires_at > v_now) THEN
    RAISE EXCEPTION 'A pending request already exists for this workspace and purpose' USING ERRCODE='23505';
  END IF;
  -- Quota values are proposal defaults for review, not approved product policy.
  IF (SELECT count(*) FROM public.channel_connection_requests WHERE requester_id=v_actor
      AND protocol_version=1 AND created_at > v_now-interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'Daily request limit reached' USING ERRCODE='54000';
  END IF;
  INSERT INTO public.channel_connection_requests(requester_id,requester_organization_id,target_partner_organization_id,
    purpose_category,message,proposed_next_step,status,expires_at,directory_partner_id,
    directory_link_version,receiver_consent_version,client_request_key,client_payload,protocol_version,revision,created_at,updated_at)
    VALUES(v_actor,p_source_organization,v_target_id,p_purpose,v_message,v_next,'pending',v_now+interval '30 days',
      p_directory,p_link_version,p_consent_version,p_client_key,v_payload,1,1,v_now,v_now) RETURNING id INTO v_id;
  INSERT INTO tf_connection_private.events(actor_id,event_type,request_id,directory_partner_id,organization_id)
    VALUES(v_actor,'request_created',v_id,p_directory,v_target_id);
  RETURN tf_connection_private.outcome(v_id,v_actor);
END;
$$;
CREATE FUNCTION public.tf_connection_lookup_v1(p_client_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_id uuid;
BEGIN
  PERFORM tf_connection_private.lock_protocol(false);
  IF v_actor IS NULL OR p_client_key IS NULL THEN RAISE EXCEPTION 'Request lookup unavailable' USING ERRCODE='42501'; END IF;
  SELECT id INTO v_id FROM public.channel_connection_requests
    WHERE requester_id=v_actor AND client_request_key=p_client_key AND protocol_version=1;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('found',false); END IF;
  -- Current sending eligibility is not required to read one's recorded outcome.
  RETURN pg_catalog.jsonb_build_object('found',true,'outcome',tf_connection_private.outcome(v_id,v_actor));
END;
$$;
CREATE FUNCTION public.tf_connection_respond_v1(p_request uuid,p_expected_revision bigint,p_decision text,p_operation_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_actor uuid := auth.uid(); v_req record; v_target jsonb; v_channel uuid; v_now timestamptz;
BEGIN
  PERFORM tf_connection_private.lock_protocol();
  IF p_request IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_decision IS NULL OR p_decision NOT IN ('accepted','declined') THEN
    RAISE EXCEPTION 'Recorded request and decision are required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_req FROM public.channel_connection_requests WHERE id=p_request FOR UPDATE;
  IF NOT FOUND OR v_actor IS NULL OR v_req.requester_id=v_actor THEN RAISE EXCEPTION 'Response unavailable' USING ERRCODE='42501'; END IF;
  PERFORM tf_connection_private.require_actor(v_actor,v_req.target_partner_organization_id,true);
  PERFORM 1 FROM public.organizations WHERE id=v_req.target_partner_organization_id AND type IN ('partner','agency');
  IF NOT FOUND THEN RAISE EXCEPTION 'Receiving workspace unavailable'; END IF;
  PERFORM tf_connection_private.claim_operation(v_actor,p_operation_key,p_request,
    pg_catalog.jsonb_build_object('action','respond','decision',p_decision,'expected_revision',p_expected_revision));
  IF v_req.status::text=p_decision THEN RETURN tf_connection_private.outcome(p_request,v_actor); END IF;
  IF v_req.status <> 'pending' OR v_req.resulting_channel_id IS NOT NULL OR v_req.revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Request changed; reload before responding' USING ERRCODE='40001';
  END IF;
  v_now := pg_catalog.clock_timestamp();
  IF v_req.expires_at <= v_now THEN RAISE EXCEPTION 'Request expired' USING ERRCODE='22023'; END IF;
  IF p_decision='declined' THEN
    UPDATE public.channel_connection_requests SET status='declined',revision=revision+1,responded_by=v_actor,responded_at=v_now WHERE id=p_request;
    INSERT INTO tf_connection_private.events(actor_id,event_type,request_id) VALUES(v_actor,'request_declined',p_request);
    RETURN tf_connection_private.outcome(p_request,v_actor);
  END IF;
  IF v_req.protocol_version IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Legacy acceptance requires reviewed reconciliation' USING ERRCODE='55000'; END IF;
  PERFORM tf_connection_private.require_actor(v_req.requester_id,v_req.requester_organization_id);
  v_target := tf_connection_private.live_target(v_req.directory_partner_id,v_req.directory_link_version,v_req.receiver_consent_version);
  IF (v_target->>'organization_id')::uuid IS DISTINCT FROM v_req.target_partner_organization_id THEN RAISE EXCEPTION 'Original receiving workspace changed' USING ERRCODE='40001'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_memberships WHERE organization_id=v_req.target_partner_organization_id
    AND user_id=v_req.requester_id AND status='active') THEN RAISE EXCEPTION 'Requester context now belongs to the receiving workspace' USING ERRCODE='40001'; END IF;
  -- Metadata locks may have waited. Recheck expiry after all eligibility/link reads.
  v_now := pg_catalog.clock_timestamp();
  IF v_req.expires_at <= v_now THEN RAISE EXCEPTION 'Request expired' USING ERRCODE='22023'; END IF;
  INSERT INTO public.channels(kind,title,purpose,organization_id,partner_organization_id,created_by,connection_request_id)
    VALUES('partner_outreach','Partner: '||(v_target->>'organization_name'),'Partner Connection',
      v_req.requester_organization_id,v_req.target_partner_organization_id,v_actor,p_request) RETURNING id INTO v_channel;
  -- Fresh channel only: never UPSERT/reactivate a departed member or infer consent.
  INSERT INTO public.channel_members(channel_id,user_id,member_role,added_by) VALUES
    (v_channel,v_actor,'admin',v_actor),(v_channel,v_req.requester_id,'member',v_actor);
  UPDATE public.channel_connection_requests SET status='accepted',revision=revision+1,responded_by=v_actor,responded_at=v_now,
    resulting_channel_id=v_channel,setup_completed_at=v_now WHERE id=p_request;
  INSERT INTO public.channel_audit_events(channel_id,actor_id,event_type,target_user_id,metadata)
    VALUES(v_channel,v_actor,'partner_connection_accepted',v_req.requester_id,pg_catalog.jsonb_build_object('request_id',p_request));
  INSERT INTO tf_connection_private.events(actor_id,event_type,request_id) VALUES(v_actor,'request_accepted',p_request);
  RETURN tf_connection_private.outcome(p_request,v_actor);
  -- No exception-swallowing: any insert/link/audit failure rolls all of this back.
END;
$$;
CREATE FUNCTION public.tf_connection_withdraw_v1(p_request uuid,p_expected_revision bigint,p_operation_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE v_actor uuid := auth.uid(); v_req record;
BEGIN
  PERFORM tf_connection_private.lock_protocol();
  IF p_request IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 THEN RAISE EXCEPTION 'Recorded request is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_req FROM public.channel_connection_requests WHERE id=p_request FOR UPDATE;
  IF NOT FOUND OR v_actor IS NULL OR v_req.requester_id <> v_actor THEN RAISE EXCEPTION 'Withdrawal unavailable' USING ERRCODE='42501'; END IF;
  -- Own-request withdrawal remains possible after role/source-membership loss.
  PERFORM tf_connection_private.claim_operation(v_actor,p_operation_key,p_request,
    pg_catalog.jsonb_build_object('action','withdraw','expected_revision',p_expected_revision));
  IF v_req.status='withdrawn' THEN RETURN tf_connection_private.outcome(p_request,v_actor); END IF;
  IF v_req.status <> 'pending' OR v_req.resulting_channel_id IS NOT NULL OR v_req.revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Request changed; reload before withdrawing' USING ERRCODE='40001';
  END IF;
  IF v_req.expires_at <= pg_catalog.clock_timestamp() THEN RAISE EXCEPTION 'Request expired' USING ERRCODE='22023'; END IF;
  UPDATE public.channel_connection_requests SET status='withdrawn',revision=revision+1,responded_by=v_actor,responded_at=pg_catalog.clock_timestamp() WHERE id=p_request;
  INSERT INTO tf_connection_private.events(actor_id,event_type,request_id) VALUES(v_actor,'request_withdrawn',p_request);
  RETURN tf_connection_private.outcome(p_request,v_actor);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tf_connection_private FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.tf_connection_link_v1(uuid,uuid,bigint,text,text),
  public.tf_connection_consent_v1(uuid,bigint,boolean),
  public.tf_connection_link_state_v1(uuid), public.tf_connection_consent_state_v1(uuid),
  public.tf_connection_targets_v1(uuid,uuid,integer),
  public.tf_connection_create_v1(uuid,bigint,bigint,uuid,uuid,text,text,text),
  public.tf_connection_lookup_v1(uuid), public.tf_connection_respond_v1(uuid,bigint,text,uuid),
  public.tf_connection_withdraw_v1(uuid,bigint,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tf_connection_link_v1(uuid,uuid,bigint,text,text),
  public.tf_connection_consent_v1(uuid,bigint,boolean),
  public.tf_connection_link_state_v1(uuid), public.tf_connection_consent_state_v1(uuid),
  public.tf_connection_targets_v1(uuid,uuid,integer),
  public.tf_connection_create_v1(uuid,bigint,bigint,uuid,uuid,text,text,text),
  public.tf_connection_lookup_v1(uuid), public.tf_connection_respond_v1(uuid,bigint,text,uuid),
  public.tf_connection_withdraw_v1(uuid,bigint,uuid) TO authenticated;

ROLLBACK;
