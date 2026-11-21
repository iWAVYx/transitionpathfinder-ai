-- Separate review draft only. No canonical migration or hosted authorization.
BEGIN;
DO $baseline$
BEGIN
 IF to_regprocedure('public.create_student_with_setup(uuid,uuid,jsonb)') IS NOT NULL
 OR to_regprocedure('public.ensure_student_self_profile()') IS NULL
 OR to_regprocedure('public.attach_my_pathway_license_to_student(uuid)') IS NULL
 OR (SELECT count(*) FROM pg_class WHERE oid IN('public.students'::regclass,'public.student_guardians'::regclass,'public.student_team_members'::regclass) AND relrowsecurity)<>3 THEN
 RAISE EXCEPTION 'Expected student setup baseline required.' USING ERRCODE='55000'; END IF;
END;$baseline$;

-- INVOKER deliberately retains caller RLS, grants and the existing licensed-seat RPC.
-- Any failed receipt or side effect raises before this statement can commit.
CREATE FUNCTION public.create_student_with_setup(_expected_viewer_id uuid,_request_id uuid,_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $setup$
DECLARE actor uuid:=auth.uid();profile public.profiles%ROWTYPE;saved public.students%ROWTYPE;
 relation jsonb:=NULL;relation_kind text:=NULL;licensed boolean:=NULL;expected jsonb;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _request_id IS NULL
 OR _fields IS NULL OR jsonb_typeof(_fields)<>'object' THEN
 RAISE EXCEPTION 'Invalid student setup intent.' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_fields) k WHERE k NOT IN('first_name','last_name','grade_band','school','date_of_birth','notes'))
 OR EXISTS(SELECT 1 FROM jsonb_each(_fields) e WHERE jsonb_typeof(e.value) NOT IN('string','null'))
 OR length(btrim(coalesce(_fields->>'first_name','')))=0 OR length(_fields->>'first_name')>80
 OR length(_fields->>'last_name')>80 OR length(_fields->>'school')>160 OR length(_fields->>'notes')>2000
 OR ((_fields->>'grade_band') IS NOT NULL AND (_fields->>'grade_band') NOT IN('6-8','9-10','11-12','post-secondary','not-applicable'))
 OR ((_fields->>'date_of_birth') IS NOT NULL AND (_fields->>'date_of_birth')!~'^\d{4}-\d{2}-\d{2}$') THEN
 RAISE EXCEPTION 'Invalid student fields.' USING ERRCODE='22023';END IF;
 -- Lock actual account metadata through the entire operation. Do not infer a role.
 SELECT * INTO profile FROM public.profiles WHERE id=actor FOR SHARE;
 IF NOT FOUND OR nullif(profile.primary_role,'') IS NULL OR nullif(profile.email,'') IS NULL THEN
 RAISE EXCEPTION 'Account details unavailable.' USING ERRCODE='42501';END IF;
 IF profile.primary_role='student' THEN
  SELECT * INTO saved FROM public.ensure_student_self_profile();
  IF saved.id IS NULL OR saved.student_user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Self profile unconfirmed.';END IF;
 ELSE
  expected:=jsonb_build_object('id',_request_id,'owner_id',actor,'student_user_id',NULL,
   'first_name',btrim(_fields->>'first_name'),'last_name',_fields->>'last_name','grade_band',_fields->>'grade_band',
   'school',_fields->>'school','date_of_birth',_fields->>'date_of_birth','notes',_fields->>'notes','organization_id',profile.organization_id);
  INSERT INTO public.students(id,owner_id,first_name,last_name,grade_band,school,date_of_birth,notes,organization_id)
  VALUES(_request_id,actor,expected->>'first_name',expected->>'last_name',expected->>'grade_band',expected->>'school',
    (expected->>'date_of_birth')::date,expected->>'notes',profile.organization_id) RETURNING * INTO saved;
  IF saved.id IS NULL OR NOT(to_jsonb(saved) @> expected) THEN RAISE EXCEPTION 'Student receipt unconfirmed.';END IF;
  IF profile.primary_role IN('parent','guardian') THEN
   relation_kind:='guardian';
   INSERT INTO public.student_guardians(student_id,guardian_user_id,guardian_email,relationship,is_primary,verified)
   VALUES(saved.id,actor,profile.email,profile.primary_role,true,true) RETURNING to_jsonb(student_guardians.*) INTO relation;
   IF relation IS NULL OR NOT(relation @> jsonb_build_object('student_id',saved.id,'guardian_user_id',actor,
    'guardian_email',profile.email,'relationship',profile.primary_role,'is_primary',true,'verified',true)) THEN RAISE EXCEPTION 'Guardian receipt unconfirmed.';END IF;
   SELECT public.attach_my_pathway_license_to_student(saved.id) INTO licensed;
   IF licensed IS NULL THEN RAISE EXCEPTION 'License attachment unconfirmed.';END IF;
  ELSIF profile.primary_role IN('educator','teacher','case_manager','administrator','school_admin','admin') THEN
   relation_kind:='team';
   INSERT INTO public.student_team_members(student_id,member_user_id,member_email,role_on_team,organization_id,status)
   VALUES(saved.id,actor,profile.email,CASE WHEN profile.primary_role='administrator' THEN 'school_admin' ELSE profile.primary_role END,profile.organization_id,'active')
   RETURNING to_jsonb(student_team_members.*) INTO relation;
   IF relation IS NULL OR NOT(relation @> jsonb_build_object('student_id',saved.id,'member_user_id',actor,'member_email',profile.email,
    'role_on_team',CASE WHEN profile.primary_role='administrator' THEN 'school_admin' ELSE profile.primary_role END,'organization_id',profile.organization_id,'status','active')) THEN RAISE EXCEPTION 'Team receipt unconfirmed.';END IF;
  END IF;
 END IF;
 RETURN jsonb_build_object('schema','student-setup-v1','actor_id',actor,'request_id',_request_id,'account_role',profile.primary_role,
  'organization_id',profile.organization_id,'account_email',profile.email,'self_profile',profile.primary_role='student',
  'row',to_jsonb(saved),'relationship_kind',relation_kind,'relationship',relation,'license_attached',licensed);
END;$setup$;
REVOKE ALL ON FUNCTION public.create_student_with_setup(uuid,uuid,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.create_student_with_setup(uuid,uuid,jsonb) TO authenticated;
COMMIT;
