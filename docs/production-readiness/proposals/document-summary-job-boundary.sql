-- REVIEW PROPOSAL ONLY. Not canonical or authorized for hosted execution.
-- Prerequisite to putting verified document text/results into background jobs.
-- Does not implement file reads, grounding, provider calls or job reservations.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;

DO $job_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='public.ai_jobs'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid='public.ai_jobs'::regclass
      AND polname='View own or student-accessible jobs' AND polpermissive AND polcmd='r') THEN
    RAISE EXCEPTION 'The reviewed job read policy and row security are required.' USING ERRCODE='55000';
  END IF;
END;
$job_preflight$;

CREATE FUNCTION public.can_read_document_summary_job(_user_id uuid,_student_id uuid,_document_id text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog
AS $job_access$
BEGIN
  -- Callable only for the authenticated reader, never to probe another user.
  IF _user_id IS NULL OR _user_id IS DISTINCT FROM auth.uid() OR _student_id IS NULL
    OR _document_id IS NULL OR _document_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id=_document_id::uuid AND d.student_id=_student_id
      AND d.archived_at IS NULL AND d.deleted_at IS NULL
      AND d.scan_status='clean' AND d.review_status<>'rejected'
      AND public.is_partner_only(_user_id) IS FALSE
      AND public.can_access_student(_user_id,d.student_id) IS TRUE
      AND public.can_view_document(_user_id,d.id) IS TRUE
  );
END;
$job_access$;
REVOKE ALL ON FUNCTION public.can_read_document_summary_job(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_read_document_summary_job(uuid,uuid,text) TO authenticated;

-- Restrictive policies narrow every permissive path, including creator/admin.
-- Other job types retain their existing policies. Service maintenance bypasses
-- RLS as before; these policies are not a provider or worker authenticity proof.
CREATE POLICY document_summary_explicit_read ON public.ai_jobs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (job_type IS DISTINCT FROM 'document_summary' OR
    public.can_read_document_summary_job(auth.uid(),student_id,input_source->>'document_id'));
CREATE POLICY document_summary_scoped_request ON public.ai_jobs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (job_type IS DISTINCT FROM 'document_summary' OR (
    triggered_by_user_id=auth.uid()
    AND status='queued' AND result_payload IS NULL AND result_id IS NULL
    AND error_message IS NULL AND attempts=0 AND locked_at IS NULL
    AND public.can_read_document_summary_job(auth.uid(),student_id,input_source->>'document_id')));
CREATE POLICY document_summary_server_update ON public.ai_jobs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (job_type IS DISTINCT FROM 'document_summary')
  WITH CHECK (job_type IS DISTINCT FROM 'document_summary');
CREATE POLICY document_summary_server_delete ON public.ai_jobs
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (job_type IS DISTINCT FROM 'document_summary');
COMMIT;
