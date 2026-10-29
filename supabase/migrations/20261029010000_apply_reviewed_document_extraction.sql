-- Atomic caller-RLS application of the exact browser-reviewed extraction.
-- Prepared for a coordinated separately authorized migration/caller release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $application_prerequisites$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['public.students','public.documents','public.document_extractions','public.transition_profiles','public.evidence_items'] LOOP
    IF to_regclass(relation_name) IS NULL THEN RAISE EXCEPTION 'Atomic review relations are required.' USING ERRCODE='55000'; END IF;
    EXECUTE format('LOCK TABLE %s IN ACCESS SHARE MODE',relation_name);
    IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity) THEN
      RAISE EXCEPTION 'Atomic review prerequisites require existing row security.' USING ERRCODE='55000';
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.document_extractions'::regclass
    AND tgname='document_extractions_set_updated_at' AND tgenabled='O' AND NOT tgisinternal
    AND tgtype=19 AND tgnargs=0 AND tgqual IS NULL)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_index i WHERE indexrelid=to_regclass('public.evidence_items_source_unique')
      AND indrelid='public.evidence_items'::regclass AND indisunique AND indisvalid AND indpred IS NOT NULL
      AND indexprs IS NULL AND indnkeyatts=3 AND indnatts=3
      AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
        JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.ord)=ARRAY['student_id','source_kind','source_id']
      AND regexp_replace(pg_get_expr(i.indpred,i.indrelid),'[[:space:]()]','','g')='source_idISNOTNULL') THEN
    RAISE EXCEPTION 'Atomic review revision and evidence safeguards are required.' USING ERRCODE='55000';
  END IF;
END;
$application_prerequisites$;
CREATE FUNCTION public.apply_reviewed_document_extraction(
  _extraction_id uuid,_student_id uuid,_document_id uuid,
  _expected_updated_at timestamptz,_expected_sections jsonb,_emit_evidence boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $apply$
DECLARE
  actor uuid:=auth.uid(); e public.document_extractions%ROWTYPE;
  doc public.documents%ROWTYPE; student_patch jsonb:='{}'; transition_patch jsonb:='{}';
  mapping record; section jsonb; val text; changed integer; evidence_id uuid;
  applied_at timestamptz:=clock_timestamp(); revision timestamptz; metadata jsonb;
BEGIN
  IF actor IS NULL OR _extraction_id IS NULL OR _student_id IS NULL OR _document_id IS NULL
    OR _expected_updated_at IS NULL OR _expected_sections IS NULL
    OR jsonb_typeof(_expected_sections)<>'object' OR char_length(_expected_sections::text)>100000
    OR _emit_evidence IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
    RAISE EXCEPTION 'This review could not be confirmed. Reload it before applying changes.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO e FROM public.document_extractions WHERE id=_extraction_id FOR UPDATE;
  IF NOT FOUND OR e.student_id IS DISTINCT FROM _student_id OR e.document_id IS DISTINCT FROM _document_id
    OR e.updated_at IS DISTINCT FROM _expected_updated_at OR e.sections IS DISTINCT FROM _expected_sections
    OR e.status::text NOT IN('pending','needs_review','in_review') THEN
    RAISE EXCEPTION 'This review has changed. Reload it before applying changes.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO doc FROM public.documents WHERE id=e.document_id AND student_id=e.student_id FOR SHARE;
  IF NOT FOUND OR doc.archived_at IS NOT NULL OR doc.deleted_at IS NOT NULL
    OR doc.scan_status IS DISTINCT FROM 'clean' OR doc.review_status IS NULL OR doc.review_status='rejected' THEN
    RAISE EXCEPTION 'This document is not available for applying changes.' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.students WHERE id=e.student_id FOR UPDATE;
  IF NOT FOUND OR public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,e.student_id) IS DISTINCT FROM true
    OR public.can_view_document(actor,e.document_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Editing access is required to apply this review.' USING ERRCODE='42501';
  END IF;
  FOR mapping IN SELECT * FROM (VALUES
    ('student_first_name','student','first_name'),('grade_band','student','grade_band'),
    ('strengths','student','strengths_summary'),('interests','student','interests_summary'),
    ('needs','student','support_needs_summary'),('student_voice','student','student_voice_statement'),
    ('family_concerns','student','family_priorities'),('transportation','transition','transportation_goal'),
    ('supports','transition','current_services_summary'),('current_goals','transition','education_training_goal')
  ) m(section_key,target,field) LOOP
    section:=e.sections->mapping.section_key;
    IF section->>'state' IN('accepted','edited') THEN
      IF jsonb_typeof(section->'value') IS DISTINCT FROM 'string' OR char_length(section->>'value')>4000 THEN
        RAISE EXCEPTION 'A reviewed section could not be confirmed.' USING ERRCODE='42501';
      END IF;
      val:=btrim(section->>'value');
      IF val<>'' THEN
        IF mapping.section_key='grade_band' AND val NOT IN('6-8','9-10','11-12','post-secondary','not-applicable') THEN
          RAISE EXCEPTION 'Choose a supported grade before applying this review.' USING ERRCODE='42501';
        END IF;
        IF mapping.target='student' THEN student_patch:=student_patch||jsonb_build_object(mapping.field,val);
        ELSE transition_patch:=transition_patch||jsonb_build_object(mapping.field,val); END IF;
      END IF;
    END IF;
  END LOOP;
  IF student_patch='{}'::jsonb AND transition_patch='{}'::jsonb THEN
    RAISE EXCEPTION 'Review at least one profile section before applying changes.' USING ERRCODE='42501';
  END IF;
  IF student_patch<>'{}'::jsonb THEN
    UPDATE public.students s SET
      first_name=coalesce(student_patch->>'first_name',s.first_name),
      grade_band=coalesce(student_patch->>'grade_band',s.grade_band),
      strengths_summary=coalesce(student_patch->>'strengths_summary',s.strengths_summary),
      interests_summary=coalesce(student_patch->>'interests_summary',s.interests_summary),
      support_needs_summary=coalesce(student_patch->>'support_needs_summary',s.support_needs_summary),
      student_voice_statement=coalesce(student_patch->>'student_voice_statement',s.student_voice_statement),
      family_priorities=coalesce(student_patch->>'family_priorities',s.family_priorities)
      WHERE s.id=e.student_id;
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'The student profile was not saved.' USING ERRCODE='42501'; END IF;
  END IF;
  IF transition_patch<>'{}'::jsonb THEN
    INSERT INTO public.transition_profiles(student_id,transportation_goal,current_services_summary,education_training_goal)
      VALUES(e.student_id,transition_patch->>'transportation_goal',transition_patch->>'current_services_summary',transition_patch->>'education_training_goal')
      ON CONFLICT(student_id) DO UPDATE SET
        transportation_goal=coalesce(EXCLUDED.transportation_goal,transition_profiles.transportation_goal),
        current_services_summary=coalesce(EXCLUDED.current_services_summary,transition_profiles.current_services_summary),
        education_training_goal=coalesce(EXCLUDED.education_training_goal,transition_profiles.education_training_goal);
    GET DIAGNOSTICS changed=ROW_COUNT;
    IF changed<>1 THEN RAISE EXCEPTION 'The transition profile was not saved.' USING ERRCODE='42501'; END IF;
  END IF;
  metadata:=jsonb_build_object(
    'applied_student_fields',(SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) FROM jsonb_object_keys(student_patch) k),
    'applied_transition_fields',(SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) FROM jsonb_object_keys(transition_patch) k));
  IF _emit_evidence THEN
    INSERT INTO public.evidence_items(student_id,kind,subject_type,subject_id,source_kind,source_id,
      contributor_id,occurred_at,verification_state,permission_scope,payload,extraction_id)
    VALUES(e.student_id,'document_extraction','document',e.document_id,'document_extraction',e.id,
      actor,applied_at,'human_confirmed','student_team',metadata,e.id)
    ON CONFLICT(student_id,source_kind,source_id) WHERE source_id IS NOT NULL DO UPDATE SET
      contributor_id=EXCLUDED.contributor_id,occurred_at=EXCLUDED.occurred_at,
      verification_state=EXCLUDED.verification_state,payload=EXCLUDED.payload
    WHERE evidence_items.kind='document_extraction' AND evidence_items.subject_type='document'
      AND evidence_items.subject_id=EXCLUDED.subject_id AND evidence_items.extraction_id=EXCLUDED.extraction_id
    RETURNING id INTO evidence_id;
    IF evidence_id IS NULL THEN RAISE EXCEPTION 'The review evidence was not saved.' USING ERRCODE='42501'; END IF;
  END IF;
  UPDATE public.document_extractions SET status='complete',reviewer_id=actor,reviewed_at=applied_at
    WHERE id=e.id AND student_id=e.student_id AND document_id=e.document_id AND updated_at=_expected_updated_at
    RETURNING updated_at INTO revision;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 OR revision IS NULL THEN RAISE EXCEPTION 'The review was not completed.' USING ERRCODE='42501'; END IF;
  INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,student_id,metadata)
    VALUES(actor,'document.extraction.applied','document_extraction',e.id,e.student_id,metadata);
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'The review record was not saved.' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('schema','applied-document-extraction-v1','extraction_id',e.id,
    'student_id',e.student_id,'document_id',e.document_id,'status','complete','updated_at',revision,
    'evidence_saved',_emit_evidence,'evidence_id',evidence_id);
END;
$apply$;
REVOKE ALL ON FUNCTION public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean) TO authenticated;
COMMIT;
