-- REVIEW FOUNDATION ONLY; seventh noncanonical/unapplied proposal.
-- Owner-internal bookkeeping, no application/service execution grants or hooks.
-- Limits default unset. No settlement/release/reset/expiry/deletion path exists.
-- Source-bound producer/queue/claim/settlement wrappers MUST be reviewed before
-- activation. This alone does not enforce application capacity or authorize IO.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $capacity_preflight$
DECLARE expected record; relation_name text; role_name text; privilege_name text; paused_state boolean;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
  ('public.begin_document_operation(uuid,uuid,text)','4ff01874b39fa3e46c24a6bf3d8149fc'),
  ('public.finish_document_operation(uuid,uuid,uuid,text)','b7d311f760d66a7b9c8f6244c1441caa'),
  ('public.claim_admitted_document_summary(uuid,integer)','f583bd75fedfe8ab4ce31abefe7b12b3')
 ) x(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(expected.signature) AND prosecdef
    AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)=expected.body_md5
    AND proowner=CASE WHEN expected.signature='public.claim_admitted_document_summary(uuid,integer)'
     THEN current_user::regrole::oid ELSE (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.document_operation_control')) END) THEN
   RAISE EXCEPTION 'Reviewed capacity prerequisites are required.' USING ERRCODE='55000';
  END IF;
  IF has_function_privilege('anon',expected.signature,'EXECUTE') OR has_function_privilege('authenticated',expected.signature,'EXECUTE')
   OR NOT has_function_privilege('service_role',expected.signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Reviewed capacity permissions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_summary_operation_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity
   AND relowner=CASE WHEN relation_name='public.document_summary_operation_bindings' THEN current_user::regrole::oid
    ELSE (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.document_operation_control')) END) THEN
   RAISE EXCEPTION 'Reviewed private capacity prerequisites are required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private capacity prerequisite drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF has_any_column_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private capacity prerequisite drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Capacity review requires paused admission.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed') THEN
  RAISE EXCEPTION 'Existing work requires separate capacity reconciliation.' USING ERRCODE='55000';
 END IF;
END; $capacity_preflight$;
CREATE TABLE public.document_capacity_policy (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 global_units integer, actor_units integer, student_units integer,
 CHECK((global_units IS NULL AND actor_units IS NULL AND student_units IS NULL)
  OR (global_units IS NOT NULL AND actor_units IS NOT NULL AND student_units IS NOT NULL
   AND global_units BETWEEN 1 AND 1000000 AND actor_units BETWEEN 1 AND 1000000 AND student_units BETWEEN 1 AND 1000000))
);
INSERT INTO public.document_capacity_policy(singleton) VALUES(true);
CREATE TABLE public.document_capacity_reservations (
 operation_id uuid PRIMARY KEY REFERENCES public.document_operation_leases(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL, student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 producer_kind text NOT NULL CHECK(producer_kind IN ('register','rescan','apply')),
 reserved_units integer NOT NULL CHECK(reserved_units=CASE WHEN producer_kind='apply' THEN 1 ELSE 2 END),
 summary_job_id uuid UNIQUE REFERENCES public.ai_jobs(id) ON DELETE RESTRICT,
 summary_operation_id uuid UNIQUE REFERENCES public.document_operation_leases(operation_id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((producer_kind<>'apply' OR (summary_job_id IS NULL AND summary_operation_id IS NULL))
  AND (summary_operation_id IS NULL OR summary_job_id IS NOT NULL))
);
ALTER TABLE public.document_capacity_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_capacity_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_capacity_policy,public.document_capacity_reservations FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX document_capacity_actor ON public.document_capacity_reservations(actor_id);
CREATE INDEX document_capacity_student ON public.document_capacity_reservations(student_id);

-- Internal callers acquire the common fence before UPDATE takes a row lock.
CREATE FUNCTION public.lock_internal_document_capacity()
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $lock_capacity$
DECLARE paused_state boolean; control_revision bigint;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT paused,revision INTO paused_state,control_revision FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM false THEN RAISE EXCEPTION 'Document work is paused for review.' USING ERRCODE='55000'; END IF;
 PERFORM pg_advisory_xact_lock(824601,19);
 RETURN control_revision;
END; $lock_capacity$;

-- INSERT is the common serialization point even for an owner-internal writer.
-- No unit can disappear when its parent/job lease changes status. Settlement is
-- deliberately absent until exact domain completion can be proved in SQL.
CREATE FUNCTION public.guard_document_capacity_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $capacity_guard$
DECLARE policy public.document_capacity_policy%ROWTYPE; lease public.document_operation_leases%ROWTYPE;
 control_revision bigint; binding public.document_summary_operation_bindings%ROWTYPE; j public.ai_jobs%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tracked capacity cannot be removed.' USING ERRCODE='42501'; END IF;
 control_revision:=public.lock_internal_document_capacity();
 IF TG_OP='INSERT' THEN
  SELECT * INTO policy FROM public.document_capacity_policy WHERE singleton FOR SHARE;
  IF NOT FOUND OR policy.global_units IS NULL OR policy.actor_units IS NULL OR policy.student_units IS NULL THEN
   RAISE EXCEPTION 'Capacity policy requires review.' USING ERRCODE='55000';
  END IF;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.operation_id FOR SHARE;
  IF NOT FOUND OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM NEW.actor_id
   OR lease.operation_kind IS DISTINCT FROM NEW.producer_kind OR lease.admitted_revision IS DISTINCT FROM control_revision
   OR NEW.student_id IS NULL OR public.can_edit_student(NEW.actor_id,NEW.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false
   OR NEW.summary_job_id IS NOT NULL OR NEW.summary_operation_id IS NOT NULL THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF COALESCE((SELECT sum(reserved_units) FROM public.document_capacity_reservations),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(reserved_units) FROM public.document_capacity_reservations WHERE actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(reserved_units) FROM public.document_capacity_reservations WHERE student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['summary_job_id','summary_operation_id']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['summary_job_id','summary_operation_id']) THEN
  RAISE EXCEPTION 'Tracked capacity identity cannot change.' USING ERRCODE='42501';
 END IF;
 IF OLD.summary_job_id IS NULL AND NEW.summary_job_id IS NOT NULL AND NEW.summary_operation_id IS NULL
   AND OLD.producer_kind IN ('register','rescan') THEN
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=OLD.operation_id FOR SHARE;
  SELECT * INTO j FROM public.ai_jobs WHERE id=NEW.summary_job_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR NOT FOUND OR j.job_type<>'document_summary' OR j.status<>'queued'
   OR j.locked_at IS NOT NULL OR j.attempts<>0 OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id
   OR j.student_id IS DISTINCT FROM OLD.student_id OR public.can_edit_student(OLD.actor_id,OLD.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(OLD.actor_id) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSIF OLD.summary_job_id IS NOT NULL AND NEW.summary_job_id IS NOT DISTINCT FROM OLD.summary_job_id
   AND OLD.summary_operation_id IS NULL AND NEW.summary_operation_id IS NOT NULL THEN
  SELECT * INTO binding FROM public.document_summary_operation_bindings
   WHERE job_id=OLD.summary_job_id AND operation_id=NEW.summary_operation_id FOR SHARE;
  IF NOT FOUND OR binding.actor_id IS DISTINCT FROM OLD.actor_id OR binding.student_id IS DISTINCT FROM OLD.student_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=OLD.summary_job_id FOR SHARE;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.summary_operation_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR lease.operation_kind IS DISTINCT FROM 'summary' OR lease.actor_id IS DISTINCT FROM OLD.actor_id
   OR j.status IS DISTINCT FROM 'processing' OR j.locked_at IS DISTINCT FROM binding.claim_at OR j.attempts IS DISTINCT FROM binding.claim_attempt
   OR j.student_id IS DISTINCT FROM OLD.student_id OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSE RAISE EXCEPTION 'Tracked capacity cannot be replayed or released.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $capacity_guard$;
CREATE TRIGGER document_capacity_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_capacity_reservations
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_capacity_reservation();

CREATE FUNCTION public.reserve_internal_document_capacity(_operation_id uuid,_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $reserve_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity();
 INSERT INTO public.document_capacity_reservations(operation_id,actor_id,student_id,producer_kind,reserved_units)
  SELECT operation_id,actor_id,_student_id,operation_kind,CASE WHEN operation_kind='apply' THEN 1 ELSE 2 END
  FROM public.document_operation_leases WHERE operation_id=_operation_id AND state='active' AND operation_kind IN ('register','rescan','apply');
 IF NOT FOUND THEN RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501'; END IF;
END; $reserve_capacity$;
CREATE FUNCTION public.queue_internal_document_capacity(_operation_id uuid,_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $queue_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity();
 IF _job_id IS NULL THEN RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501'; END IF;
 UPDATE public.document_capacity_reservations SET summary_job_id=_job_id
  WHERE operation_id=_operation_id AND summary_job_id IS NULL AND producer_kind IN ('register','rescan');
 IF NOT FOUND THEN RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501'; END IF;
END; $queue_capacity$;
CREATE FUNCTION public.claim_internal_document_capacity(_job_id uuid,_summary_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $claim_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity();
 IF _summary_operation_id IS NULL THEN RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501'; END IF;
 UPDATE public.document_capacity_reservations SET summary_operation_id=_summary_operation_id
  WHERE summary_job_id=_job_id AND summary_operation_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501'; END IF;
END; $claim_capacity$;
REVOKE ALL ON FUNCTION public.lock_internal_document_capacity(),public.guard_document_capacity_reservation(),public.reserve_internal_document_capacity(uuid,uuid),
 public.queue_internal_document_capacity(uuid,uuid),public.claim_internal_document_capacity(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.document_capacity_reservations IS
 'Dormant owner-internal two-unit producer/one-unit Apply bookkeeping. Queue and exact bound claim transfers add no units. All units remain counted, including completed or held leases. No settlement/expiry/reset/deletion. No app/service grants, source-bound wrappers, hooks or general application enforcement are installed by this foundation.';
COMMIT;
