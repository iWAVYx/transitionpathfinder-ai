-- REVIEW PROPOSAL ONLY; not canonical and not authorized for hosted execution.
-- Durable admission accounting only. No handler integration, expiry, provider
-- cancellation, historical drain proof, cleanup or student-data authorization.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE TABLE public.document_operation_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 paused boolean NOT NULL DEFAULT true,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.document_operation_control(singleton) VALUES(true);
CREATE TABLE public.document_operation_leases (
 operation_id uuid PRIMARY KEY,
 receipt_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 operation_kind text NOT NULL CHECK(operation_kind IN ('register','rescan','apply','summary')),
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','completed','needs_review')),
 admitted_revision bigint NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 CHECK((state='active')=(finished_at IS NULL))
);
CREATE TABLE public.document_operation_control_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operator_id uuid NOT NULL,
 paused boolean NOT NULL,
 revision bigint NOT NULL UNIQUE,
 reason_class text NOT NULL CHECK(reason_class IN ('maintenance','preflight','incident','resume')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_operation_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_operation_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_operation_control_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_operation_control,public.document_operation_leases,public.document_operation_control_events FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.begin_document_operation(_operation_id uuid,_actor_id uuid,_operation_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $begin_operation$
DECLARE control public.document_operation_control%ROWTYPE; lease public.document_operation_leases%ROWTYPE;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' OR _operation_id IS NULL OR _actor_id IS NULL
  OR _operation_kind IS NULL OR _operation_kind NOT IN ('register','rescan','apply','summary') THEN
  RAISE EXCEPTION 'Document work could not be admitted.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO control FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND OR control.paused THEN RAISE EXCEPTION 'Document work is paused for review.' USING ERRCODE='55000'; END IF;
 -- No reuse/retry, even after completion. Receipt is server-only fencing metadata.
 INSERT INTO public.document_operation_leases(operation_id,actor_id,operation_kind,admitted_revision)
 VALUES(_operation_id,_actor_id,_operation_kind,control.revision) RETURNING * INTO lease;
 RETURN jsonb_build_object('schema','document-operation-admitted-v1','operation_id',lease.operation_id,'receipt_id',lease.receipt_id,'revision',lease.admitted_revision);
END; $begin_operation$;

CREATE FUNCTION public.finish_document_operation(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $finish_operation$
DECLARE lease public.document_operation_leases%ROWTYPE;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' OR _operation_id IS NULL OR _actor_id IS NULL
  OR _receipt_id IS NULL OR _outcome IS NULL OR _outcome NOT IN ('completed','needs_review') THEN
  RAISE EXCEPTION 'Document completion could not be confirmed.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM _actor_id OR lease.receipt_id IS DISTINCT FROM _receipt_id THEN
  RAISE EXCEPTION 'Document completion could not be confirmed.' USING ERRCODE='42501';
 END IF;
 UPDATE public.document_operation_leases SET state=_outcome,finished_at=clock_timestamp() WHERE operation_id=_operation_id;
 RETURN jsonb_build_object('schema','document-operation-finished-v1','operation_id',_operation_id,'state',_outcome);
END; $finish_operation$;

CREATE FUNCTION public.set_document_operation_pause(_operator_id uuid,_expected_revision bigint,_paused boolean,_reason_class text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $pause_operation$
DECLARE control public.document_operation_control%ROWTYPE;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' OR _operator_id IS NULL OR _expected_revision IS NULL
  OR _paused IS NULL OR _reason_class IS NULL OR _reason_class NOT IN ('maintenance','preflight','incident','resume')
  OR ((_reason_class='resume') IS DISTINCT FROM (NOT _paused)) THEN
  RAISE EXCEPTION 'Document pause change could not be confirmed.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO control FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR control.revision<>_expected_revision OR control.paused=_paused THEN
  RAISE EXCEPTION 'Document pause changed; stop for reconciliation.' USING ERRCODE='55000';
 END IF;
 IF NOT _paused AND EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review')) THEN
  RAISE EXCEPTION 'Tracked document work still requires reconciliation.' USING ERRCODE='55000';
 END IF;
 UPDATE public.document_operation_control SET paused=_paused,revision=revision+1,changed_at=clock_timestamp() WHERE singleton RETURNING * INTO control;
 INSERT INTO public.document_operation_control_events(operator_id,paused,revision,reason_class) VALUES(_operator_id,_paused,control.revision,_reason_class);
 RETURN jsonb_build_object('schema','document-operation-pause-v1','paused',control.paused,'revision',control.revision);
END; $pause_operation$;

CREATE FUNCTION public.inspect_document_operation_drain()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $inspect_operation$
 SELECT jsonb_build_object('schema','document-operation-drain-v1','paused',c.paused,'revision',c.revision,
  'by_kind',(SELECT jsonb_agg(jsonb_build_object('kind',k.kind,'active',(SELECT count(*) FROM public.document_operation_leases l WHERE l.operation_kind=k.kind AND l.state='active'),'needs_review',(SELECT count(*) FROM public.document_operation_leases l WHERE l.operation_kind=k.kind AND l.state='needs_review')) ORDER BY k.kind) FROM (VALUES('register'),('rescan'),('apply'),('summary')) k(kind)),
  'tracked_operations_clear',NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review')),
  'legacy_handlers_covered',false,'provider_quiescence_verified',false,'ready_for_cutover',false,'cleanup_authorized',false)
 FROM public.document_operation_control c WHERE singleton;
$inspect_operation$;
REVOKE ALL ON FUNCTION public.begin_document_operation(uuid,uuid,text),public.finish_document_operation(uuid,uuid,uuid,text),public.set_document_operation_pause(uuid,bigint,boolean,text),public.inspect_document_operation_drain() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.begin_document_operation(uuid,uuid,text),public.finish_document_operation(uuid,uuid,uuid,text),public.set_document_operation_pause(uuid,bigint,boolean,text),public.inspect_document_operation_drain() TO service_role;
COMMENT ON TABLE public.document_operation_leases IS 'Permanent service-admitted work receipts, not student access grants. No expiry, automatic retry/release, provider cancellation or proof of old-handler coverage. needs_review cannot be completed or removed through these RPCs.';
COMMIT;
