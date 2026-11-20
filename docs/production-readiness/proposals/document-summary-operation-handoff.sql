-- REVIEW PROPOSAL ONLY; sixth noncanonical/unapplied control proposal.
-- Atomic queued-summary claim, source binding and operation admission only.
-- No worker activation, general cap, provider/drain proof, expiry or release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $summary_handoff_preflight$
DECLARE expected record; signature text; role_name text; relation_name text; privilege_name text; paused_state boolean;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
  ('public.begin_document_operation(uuid,uuid,text)','4ff01874b39fa3e46c24a6bf3d8149fc'),
  ('public.finish_document_operation(uuid,uuid,uuid,text)','b7d311f760d66a7b9c8f6244c1441caa'),
  ('public.read_verified_document_summary_source(uuid,timestamptz,integer)','6beb7e73b75e358ff530c8316650c1e5'),
  ('public.reserve_document_upload(uuid,uuid,text,text)','dc8972ceac29738817b32b74ad411e1b')
 ) AS x(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(expected.signature) AND prosecdef
    AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)=expected.body_md5
    AND proowner=CASE WHEN expected.signature IN ('public.begin_document_operation(uuid,uuid,text)','public.finish_document_operation(uuid,uuid,uuid,text)')
      THEN (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.document_operation_control')) ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Reviewed summary and operation prerequisites are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY['public.begin_document_operation(uuid,uuid,text)','public.finish_document_operation(uuid,uuid,uuid,text)',
  'public.read_verified_document_summary_source(uuid,timestamptz,integer)'] LOOP
  IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('authenticated',signature,'EXECUTE')
   OR NOT has_function_privilege('service_role',signature,'EXECUTE') OR NOT has_function_privilege(current_user,signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Reviewed private summary permissions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_summary_source_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity
    AND relowner=CASE WHEN relation_name='public.document_summary_source_bindings' THEN current_user::regrole::oid
      ELSE (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.document_operation_control')) END) THEN
   RAISE EXCEPTION 'Reviewed private summary tracking is required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF has_any_column_privilege(role_name,relation_name,privilege_name) THEN
     RAISE EXCEPTION 'Reviewed private summary column permissions are required.' USING ERRCODE='55000';
    END IF;
   END LOOP;
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege(role_name,relation_name,privilege_name) THEN
     RAISE EXCEPTION 'Reviewed private summary table permissions are required.' USING ERRCODE='55000';
    END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Summary handoff must be reviewed while paused.' USING ERRCODE='55000';
 END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed') THEN
  RAISE EXCEPTION 'Existing summary work requires separate review before installation.' USING ERRCODE='55000';
 END IF;
END; $summary_handoff_preflight$;

CREATE TABLE public.document_summary_operation_bindings (
 job_id uuid PRIMARY KEY REFERENCES public.ai_jobs(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE REFERENCES public.document_operation_leases(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL, student_id uuid NOT NULL, document_id uuid NOT NULL,
 object_id uuid NOT NULL, object_version text NOT NULL CHECK(btrim(object_version)<>'' AND char_length(object_version)<=1024),
 storage_path text NOT NULL, content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[0-9a-f]{64}$'),
 claim_at timestamptz NOT NULL, claim_attempt integer NOT NULL CHECK(claim_attempt>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(job_id) REFERENCES public.document_summary_source_bindings(job_id) ON DELETE RESTRICT
);
ALTER TABLE public.document_summary_operation_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_summary_operation_bindings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_document_summary_operation_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $summary_binding_guard$
BEGIN
 RAISE EXCEPTION 'The tracked summary identity cannot be changed or removed.' USING ERRCODE='42501';
END; $summary_binding_guard$;
CREATE TRIGGER summary_operation_binding_frozen BEFORE UPDATE OR DELETE ON public.document_summary_operation_bindings
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_summary_operation_binding();

CREATE FUNCTION public.claim_admitted_document_summary(_job_id uuid,_expected_attempt integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $summary_claim$
DECLARE j public.ai_jobs%ROWTYPE; source jsonb; admitted jsonb; paused_state boolean;
BEGIN
 IF _job_id IS NULL OR _expected_attempt IS NULL OR _expected_attempt<0 OR _expected_attempt>=2147483647
  OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'The summary handoff could not be confirmed.' USING ERRCODE='42501';
 END IF;
 -- Fence before job/source metadata writes; begin repeats this same shared lock.
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Document work is paused for review.' USING ERRCODE='55000';
 END IF;
 SELECT * INTO j FROM public.ai_jobs WHERE id=_job_id AND job_type='document_summary'
  AND status='queued' AND locked_at IS NULL AND attempts=_expected_attempt FOR UPDATE;
 IF NOT FOUND OR j.triggered_by_user_id IS NULL OR j.student_id IS NULL
  OR EXISTS(SELECT 1 FROM public.document_summary_operation_bindings WHERE job_id=j.id)
  OR EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'The summary handoff could not be confirmed.' USING ERRCODE='42501';
 END IF;
 UPDATE public.ai_jobs SET status='processing',locked_at=clock_timestamp(),attempts=attempts+1 WHERE id=j.id RETURNING * INTO j;
 -- The reviewed helper validates current actor/source/scan/object authority and
 -- creates its immutable metadata binding. Nothing commits without admission.
 source:=public.read_verified_document_summary_source(j.id,j.locked_at,j.attempts);
 IF source->>'schema' IS DISTINCT FROM 'verified-document-summary-source-v1'
  OR source->>'job_id' IS DISTINCT FROM j.id::text OR (source->>'claim_at')::timestamptz IS DISTINCT FROM j.locked_at
  OR (source->>'claim_attempt')::integer IS DISTINCT FROM j.attempts
  OR source->>'actor_id' IS DISTINCT FROM j.triggered_by_user_id::text OR source->>'student_id' IS DISTINCT FROM j.student_id::text
  OR NOT EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=j.id
    AND first_claim_at=j.locked_at AND first_claim_attempt=j.attempts AND first_admission_txid=txid_current()) THEN
  RAISE EXCEPTION 'The summary handoff could not be confirmed.' USING ERRCODE='55000';
 END IF;
 admitted:=public.begin_document_operation(gen_random_uuid(),j.triggered_by_user_id,'summary');
 INSERT INTO public.document_summary_operation_bindings(job_id,operation_id,actor_id,student_id,document_id,
  object_id,object_version,storage_path,content_sha256,claim_at,claim_attempt)
 VALUES(j.id,(admitted->>'operation_id')::uuid,j.triggered_by_user_id,j.student_id,(source->>'document_id')::uuid,
  (source->>'object_id')::uuid,source->>'object_version',source->>'storage_path',source->>'content_sha256',j.locked_at,j.attempts);
 RETURN jsonb_build_object('schema','document-summary-operation-claim-v1','job_id',j.id,'claim_at',j.locked_at,'claim_attempt',j.attempts,
  'actor_id',j.triggered_by_user_id,'student_id',j.student_id,'document_id',source->>'document_id',
  'object_id',source->>'object_id','object_version',source->>'object_version','storage_path',source->>'storage_path',
  'content_sha256',source->>'content_sha256','operation_id',admitted->>'operation_id','receipt_id',admitted->>'receipt_id','revision',admitted->'revision');
END; $summary_claim$;

CREATE FUNCTION public.guard_document_summary_operation_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $summary_completion_guard$
DECLARE binding public.document_summary_operation_bindings%ROWTYPE;
BEGIN
 IF NEW.state<>'completed' OR OLD.state='completed' THEN RETURN NEW; END IF;
 SELECT * INTO binding FROM public.document_summary_operation_bindings WHERE operation_id=OLD.operation_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 IF OLD.actor_id IS DISTINCT FROM binding.actor_id OR OLD.operation_kind<>'summary'
  OR NOT EXISTS(SELECT 1 FROM public.ai_jobs j JOIN public.document_summary_source_bindings s ON s.job_id=j.id
   WHERE j.id=binding.job_id AND j.job_type='document_summary' AND j.status='completed' AND j.locked_at IS NULL
    AND j.attempts=binding.claim_attempt AND j.student_id=binding.student_id AND j.triggered_by_user_id=binding.actor_id
    AND s.actor_id=binding.actor_id AND s.student_id=binding.student_id AND s.document_id=binding.document_id
    AND s.object_id=binding.object_id AND s.object_version=binding.object_version AND s.storage_path=binding.storage_path
    AND s.content_sha256=binding.content_sha256 AND s.first_claim_at=binding.claim_at AND s.first_claim_attempt=binding.claim_attempt
    AND j.result_payload->'_source'->>'document_id'=binding.document_id::text
    AND j.result_payload->'_source'->>'object_id'=binding.object_id::text
    AND j.result_payload->'_source'->>'object_version'=binding.object_version
    AND j.result_payload->'_source'->>'content_sha256'=binding.content_sha256 FOR SHARE OF j) THEN
  RAISE EXCEPTION 'The tracked summary outcome needs confirmation.' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END; $summary_completion_guard$;
CREATE TRIGGER document_operation_summary_completion BEFORE UPDATE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_summary_operation_completion();
REVOKE ALL ON FUNCTION public.guard_document_summary_operation_binding(),public.guard_document_summary_operation_completion(),
 public.claim_admitted_document_summary(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_admitted_document_summary(uuid,integer) TO service_role;
COMMIT;
