-- Archived execution evidence only. Do not automatically execute.
-- Authorized target: qgrertkqbwanerqqemph, via its signed-in Supabase SQL editor.
-- Existing synthetic QA identities; no account changes, providers or AI.
-- All fixture writes run inside a rollback-only transaction.
ROLLBACK;
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE TEMP TABLE history_acceptance_results(check_name text, passed boolean) ON COMMIT DROP;
DO $checks$
<<history_checks>>
DECLARE
 parent_id uuid := '038f92be-916f-4dc9-84e4-b36f9645f5c2';
 educator_id uuid := '44444444-4444-4444-8444-444444444444';
 actor uuid;
 intake_id uuid := 'be53e3ce-feb1-4401-93ea-d8b746b3175a';
 report_id uuid := 'a8e31a77-ff52-4a63-a9f1-9aa3a78253cd';
 original jsonb := '{"summary":"Fictional history acceptance original","goals":["Practice"]}'::jsonb;
 replacement jsonb := '{"summary":"Fictional history acceptance saved","goals":["Practice"],"section_updates":{"write_id":"0357c409-3be2-4c2a-a734-1e8b5c3e291e"}}'::jsonb;
 version integer;
 snapshot_count integer;
 stored jsonb;
 denied boolean;
BEGIN
 IF EXISTS(SELECT 1 FROM public.student_intakes WHERE id=intake_id) OR EXISTS(SELECT 1 FROM public.pathway_reports WHERE id=report_id) THEN RAISE EXCEPTION 'Fixture ID collision; stop.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=parent_id AND email='qa.parent@transitionforward.test') OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=educator_id AND email='qa.educator@transitionforward.test') THEN RAISE EXCEPTION 'Expected synthetic identities missing.'; END IF;
 INSERT INTO public.student_intakes(id,user_id,student_first_name) VALUES(intake_id,parent_id,'Fictional History QA');
 INSERT INTO public.pathway_reports(id,user_id,intake_id,model,content,student_id) VALUES(report_id,parent_id,intake_id,'synthetic-history-acceptance',original,NULL);
 FOREACH actor IN ARRAY ARRAY[parent_id,educator_id] LOOP
  UPDATE public.pathway_reports SET user_id=actor,content=original WHERE id=report_id;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor::text,'role','authenticated')::text,true);
  PERFORM set_config('role','authenticated',true);
  version := public.save_pathway_report_content_atomic(report_id,original,replacement,'Synthetic save');
  PERFORM set_config('role','none',true);
  SELECT content INTO stored FROM public.pathway_reports WHERE id=report_id;
  IF stored IS DISTINCT FROM replacement OR NOT EXISTS(SELECT 1 FROM public.pathway_report_versions WHERE pathway_report_versions.report_id=history_checks.report_id AND version_number=version AND content=original AND created_by=actor) THEN RAISE EXCEPTION 'Save snapshot/current content mismatch.'; END IF;
  INSERT INTO history_acceptance_results VALUES(CASE WHEN actor=parent_id THEN 'Family owner save and exact snapshot' ELSE 'Educator owner save and exact snapshot' END,true);
  PERFORM set_config('role','authenticated',true);
  version := public.save_pathway_report_content_atomic(report_id,replacement,original,'Synthetic restore');
  PERFORM set_config('role','none',true);
  SELECT content INTO stored FROM public.pathway_reports WHERE id=report_id;
  IF stored IS DISTINCT FROM original OR NOT EXISTS(SELECT 1 FROM public.pathway_report_versions WHERE pathway_report_versions.report_id=history_checks.report_id AND version_number=version AND content=replacement AND created_by=actor) THEN RAISE EXCEPTION 'Restore snapshot/current content mismatch.'; END IF;
  INSERT INTO history_acceptance_results VALUES(CASE WHEN actor=parent_id THEN 'Family restore retains exact saved snapshot' ELSE 'Educator restore retains exact saved snapshot' END,true);
 END LOOP;
 SELECT count(*) INTO snapshot_count FROM public.pathway_report_versions WHERE pathway_report_versions.report_id=history_checks.report_id;
 IF snapshot_count<>4 THEN RAISE EXCEPTION 'Expected four ordered snapshots.'; END IF;
 INSERT INTO history_acceptance_results VALUES('Four ordered saved versions',true);
 PERFORM set_config('role','authenticated',true);
 denied:=false;
 BEGIN PERFORM public.save_pathway_report_content_atomic(report_id,replacement,original,'Stale content'); EXCEPTION WHEN SQLSTATE '40001' THEN denied:=true; END;
 PERFORM set_config('role','none',true);
 IF NOT denied OR (SELECT count(*) FROM public.pathway_report_versions WHERE pathway_report_versions.report_id=history_checks.report_id)<>snapshot_count THEN RAISE EXCEPTION 'Conflict did not preserve history.'; END IF;
 INSERT INTO history_acceptance_results VALUES('Stale content conflict adds no snapshot',true);
 UPDATE public.pathway_reports SET content='{"summary":"Fictional direct edit"}'::jsonb WHERE id=report_id;
 PERFORM set_config('role','authenticated',true);
 denied:=false;
 BEGIN PERFORM public.save_pathway_report_content_atomic(report_id,original,replacement,'Direct edit conflict'); EXCEPTION WHEN SQLSTATE '40001' THEN denied:=true; END;
 PERFORM set_config('role','none',true);
 IF NOT denied OR (SELECT count(*) FROM public.pathway_report_versions WHERE pathway_report_versions.report_id=history_checks.report_id)<>snapshot_count THEN RAISE EXCEPTION 'Unmarked direct edit conflict did not preserve history.'; END IF;
 INSERT INTO history_acceptance_results VALUES('Direct edit without metadata causes conflict',true);
 PERFORM set_config('request.jwt.claim.sub',parent_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',parent_id::text,'role','authenticated')::text,true);
 PERFORM set_config('role','authenticated',true);
 denied:=false;
 BEGIN PERFORM public.save_pathway_report_content_atomic(report_id,'{"summary":"Fictional direct edit"}'::jsonb,replacement,'Different owner'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM set_config('role','none',true);
 IF NOT denied THEN RAISE EXCEPTION 'Different owner was not denied.'; END IF;
 INSERT INTO history_acceptance_results VALUES('Different owner denied by hosted ownership/RLS',true);
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{}',true);
 PERFORM set_config('role','authenticated',true);
 denied:=false;
 BEGIN PERFORM public.save_pathway_report_content_atomic(report_id,original,replacement,'No identity'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 PERFORM set_config('role','none',true);
 IF NOT denied THEN RAISE EXCEPTION 'Missing identity was not denied.'; END IF;
 INSERT INTO history_acceptance_results VALUES('Missing identity denied',true);
END;
$checks$;
DO $result$ BEGIN IF (SELECT count(*) FROM history_acceptance_results WHERE passed) <> 9 THEN RAISE EXCEPTION 'Expected nine passing checks.'; END IF; END $result$;
ROLLBACK;
SELECT 'Nine SQL ownership/save/restore/conflict assertions passed' AS result,
 '20261012190000' AS migration_version,
 (SELECT NOT prosecdef FROM pg_proc WHERE oid='public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)'::regprocedure) AS security_invoker,

 (SELECT count(*) FROM public.pathway_reports WHERE id='a8e31a77-ff52-4a63-a9f1-9aa3a78253cd') AS reports_remaining,
 (SELECT count(*) FROM public.pathway_report_versions WHERE report_id='a8e31a77-ff52-4a63-a9f1-9aa3a78253cd') AS versions_remaining,
 (SELECT count(*) FROM public.student_intakes WHERE id='be53e3ce-feb1-4401-93ea-d8b746b3175a') AS intakes_remaining;
