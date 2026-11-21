-- REVIEW ONLY: fourth separate review draft, not canonical or ledger-promoted.
-- Install after admin-grant retirement, parent binding and original-file grants.
-- No hosted execution without fresh authorization. No existing rows rewritten.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.document_extractions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.document_summaries IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)') AND prosecdef AND md5(prosrc)='c6a07b2484f7140c5d147aa6ccadf61c')
 OR (SELECT count(*) FROM pg_catalog.pg_class WHERE oid IN (pg_catalog.to_regclass('public.documents'),pg_catalog.to_regclass('public.document_extractions'),pg_catalog.to_regclass('public.document_summaries')) AND relrowsecurity)<>3
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.documents') AND polname='document_original_read_boundary' AND NOT polpermissive)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname='student_document_original_read_boundary' AND NOT polpermissive)
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polname IN ('extraction_original_read_boundary','summary_original_read_boundary'))
 OR pg_catalog.to_regprocedure('public.read_reviewed_student_document_summaries(uuid,uuid,uuid,timestamptz,timestamptz)') IS NOT NULL THEN
  RAISE EXCEPTION 'Reviewed summary-scope prerequisites are missing or changed; stop for review.' USING ERRCODE='55000';
 END IF;
END;
$baseline$;
DO $replace_body$
DECLARE before_proc pg_catalog.pg_proc%ROWTYPE;after_proc pg_catalog.pg_proc%ROWTYPE;definition text;
 replacement text := $body$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND NOT public.is_partner_only(_user_id)
      AND (NOT public.is_platform_admin(_user_id) OR public.can_access_student(_user_id,d.student_id))
      AND (
        public.can_edit_student(_user_id, d.student_id)
        OR EXISTS (
          SELECT 1 FROM public.student_collaborators c
          WHERE c.student_id=d.student_id AND c.user_id=_user_id AND c.status='accepted'
        )
        OR EXISTS (
          SELECT 1 FROM public.document_permissions p
          WHERE p.document_id = d.id
            AND p.student_id = d.student_id
            AND p.user_id = _user_id
            AND p.role_type IS NULL
            AND p.permission_level IN ('view_document','download_document','review_document','edit_metadata','manage')
        )
      )
  );
$body$;
BEGIN
 SELECT * INTO STRICT before_proc FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)');
 definition:=pg_catalog.pg_get_functiondef(before_proc.oid);
 IF pg_catalog.md5(replacement)<>'575a42ff79a948f356c92cf0eecb3a33' OR pg_catalog.strpos(definition,before_proc.prosrc)=0 THEN
  RAISE EXCEPTION 'Reviewed summary-scope body does not match.' USING ERRCODE='55000';
 END IF;
 EXECUTE pg_catalog.replace(definition,before_proc.prosrc,replacement);
 SELECT * INTO STRICT after_proc FROM pg_catalog.pg_proc WHERE oid=before_proc.oid;
 IF after_proc.proowner IS DISTINCT FROM before_proc.proowner OR after_proc.proacl IS DISTINCT FROM before_proc.proacl
 OR after_proc.proconfig IS DISTINCT FROM before_proc.proconfig OR after_proc.prosecdef IS DISTINCT FROM before_proc.prosecdef
 OR after_proc.prolang IS DISTINCT FROM before_proc.prolang OR after_proc.provolatile IS DISTINCT FROM before_proc.provolatile
 OR after_proc.prosrc IS DISTINCT FROM replacement THEN
  RAISE EXCEPTION 'Summary-scope routine metadata changed outside reviewed body.' USING ERRCODE='55000';
 END IF;
END;
$replace_body$;
-- Raw rows contain originals, clinical text and unreviewed/private fields.
-- Summary-only readers use the explicit projection below, not whole-row SELECT.
CREATE POLICY extraction_original_read_boundary ON public.document_extractions AS RESTRICTIVE
 FOR SELECT TO anon,authenticated USING(EXISTS(
  SELECT 1 FROM public.documents d WHERE d.id=document_extractions.document_id
   AND d.student_id=document_extractions.student_id AND public.can_view_document(auth.uid(),d.id)
 ));
CREATE POLICY summary_original_read_boundary ON public.document_summaries AS RESTRICTIVE
 FOR SELECT TO anon,authenticated USING(EXISTS(
  SELECT 1 FROM public.documents d WHERE d.id=document_summaries.document_id
   AND d.student_id=document_summaries.student_id AND public.can_view_document(auth.uid(),d.id)
 ));
CREATE FUNCTION public.read_reviewed_student_document_summaries(
 _student_id uuid,_expected_viewer_id uuid,_document_id uuid DEFAULT NULL,
 _expected_document_updated_at timestamptz DEFAULT NULL,_expected_extraction_updated_at timestamptz DEFAULT NULL
) RETURNS TABLE(document_id uuid,student_id uuid,document_title text,doc_type text,created_at timestamptz,
 document_updated_at timestamptz,extraction_updated_at timestamptz,summary_ready boolean,sections jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $projection$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR _expected_viewer_id IS DISTINCT FROM actor OR _student_id IS NULL
 OR public.can_access_student(actor,_student_id) IS DISTINCT FROM true
 OR public.is_partner_only(actor) IS DISTINCT FROM false
 OR (_document_id IS NOT NULL AND _expected_document_updated_at IS NULL) THEN
  RAISE EXCEPTION 'Reviewed document summary could not be confirmed.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 WITH candidates AS MATERIALIZED (
  SELECT d.id,d.student_id,pg_catalog.left(d.title,200) AS title,d.doc_type,d.created_at,d.updated_at,e.updated_at AS review_revision,e.status,e.sections
  FROM public.documents d LEFT JOIN public.document_extractions e ON e.document_id=d.id AND e.student_id=d.student_id
  WHERE d.student_id=_student_id AND d.archived_at IS NULL AND d.deleted_at IS NULL AND d.scan_status='clean' AND d.scan_verdict->>'code' IS DISTINCT FROM 'infected' AND d.review_status IS DISTINCT FROM 'rejected'
   AND d.doc_type IN ('iep','current-iep','previous-iep','transition-plan')
   AND (_document_id IS NULL OR (d.id=_document_id AND d.updated_at=_expected_document_updated_at
        AND e.updated_at IS NOT DISTINCT FROM _expected_extraction_updated_at))
  ORDER BY d.created_at DESC,d.id DESC LIMIT 50
 )
 SELECT c.id,c.student_id,c.title,c.doc_type,c.created_at,c.updated_at,c.review_revision,
        pg_catalog.jsonb_array_length(projected.approved_sections)>0,
        CASE WHEN _document_id IS NULL THEN '[]'::jsonb ELSE projected.approved_sections END
 FROM candidates c CROSS JOIN LATERAL (
  SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('key',k.key,'value',pg_catalog.btrim(c.sections->k.key->>'value')) ORDER BY k.position),'[]'::jsonb) AS approved_sections
  FROM pg_catalog.unnest(ARRAY['strengths','interests','needs','supports','current_goals','transportation','communication','student_voice']) WITH ORDINALITY k(key,position)
  WHERE c.status::text IN ('in_review','complete') AND pg_catalog.jsonb_typeof(c.sections->k.key)='object'
    AND c.sections->k.key->>'state' IN ('accepted','edited')
    AND pg_catalog.jsonb_typeof(c.sections->k.key->'value')='string'
    AND pg_catalog.length(pg_catalog.btrim(c.sections->k.key->>'value')) BETWEEN 1 AND 16000
 ) projected
 ORDER BY c.created_at DESC,c.id DESC;
END;
$projection$;
REVOKE ALL ON FUNCTION public.read_reviewed_student_document_summaries(uuid,uuid,uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_reviewed_student_document_summaries(uuid,uuid,uuid,timestamptz,timestamptz) TO authenticated;
COMMIT;
