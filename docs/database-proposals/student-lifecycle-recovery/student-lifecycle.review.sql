-- Separate review draft 16. Not a canonical migration; no hosted authorization.
BEGIN;
CREATE TABLE public.student_lifecycle_receipts (
 student_id uuid PRIMARY KEY,
 original_owner_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 removed_at timestamptz
);
-- Minimal identity/outcome only: no names, answers, reports, or document paths.
-- Deliberately no cascading student FK: deletion must not erase its tombstone.
ALTER TABLE public.student_lifecycle_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_lifecycle_receipts FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.record_student_lifecycle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$
BEGIN
 IF TG_OP='INSERT' THEN
  -- A failed outer setup transaction also rolls back this reservation.
  -- A committed deletion leaves this unique key permanently occupied.
  INSERT INTO public.student_lifecycle_receipts(student_id,original_owner_id)
  VALUES(NEW.id,NEW.owner_id);
  RETURN NEW;
 ELSIF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Student identity cannot be replaced.' USING ERRCODE='23514';END IF;
  RETURN NEW;
 ELSIF TG_OP='DELETE' THEN
  -- Includes pre-installation students without pretending their creation was tracked.
  INSERT INTO public.student_lifecycle_receipts(student_id,original_owner_id,removed_at)
  VALUES(OLD.id,OLD.owner_id,clock_timestamp())
  ON CONFLICT(student_id) DO UPDATE SET removed_at=EXCLUDED.removed_at;
  RETURN OLD;
 END IF;
 RAISE EXCEPTION 'Unsupported lifecycle operation.';
END;$body$;
REVOKE ALL ON FUNCTION public.record_student_lifecycle() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER student_lifecycle_created BEFORE INSERT ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.record_student_lifecycle();
CREATE TRIGGER student_lifecycle_identity BEFORE UPDATE OF id ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.record_student_lifecycle();
CREATE TRIGGER student_lifecycle_removed AFTER DELETE ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.record_student_lifecycle();

CREATE FUNCTION public.read_student_creation_outcome(_expected_viewer_id uuid,_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$
DECLARE actor uuid:=auth.uid();receipt public.student_lifecycle_receipts%ROWTYPE;current_owner uuid;state text;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _request_id IS NULL THEN
  RAISE EXCEPTION 'Account changed. Sign in again before checking this request.' USING ERRCODE='42501';
 END IF;
 -- Match the writer lock order: student, then lifecycle receipt. No PII returned.
 SELECT owner_id INTO current_owner FROM public.students WHERE id=_request_id AND owner_id=actor FOR SHARE;
 SELECT * INTO receipt FROM public.student_lifecycle_receipts
  WHERE student_id=_request_id AND original_owner_id=actor;
 IF NOT FOUND THEN state:='unconfirmed';
 ELSIF receipt.removed_at IS NOT NULL THEN state:='removed';
 ELSIF current_owner=actor THEN state:='present';
 ELSE state:='unconfirmed'; END IF;
 -- 'present' means the identity exists, NOT that original setup metadata remains
 -- unchanged or that onboarding finished. No automatic creation/replay permission.
 RETURN jsonb_build_object('schema','student-creation-outcome-v1',
  'actor_id',actor,'request_id',_request_id,'status',state);
END;$body$;
REVOKE ALL ON FUNCTION public.read_student_creation_outcome(uuid,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.read_student_creation_outcome(uuid,uuid) TO authenticated;

-- A student DELETE must not bypass paused hard-document deletion by cascading
-- metadata away while leaving storage/provider objects behind. Replace rather
-- than add a second FK: an older CASCADE trigger could otherwise run first.
DO $guard$
DECLARE dependency record;n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_constraint WHERE conrelid='public.documents'::regclass
  AND confrelid='public.students'::regclass AND contype='f';
 IF n<>1 THEN RAISE EXCEPTION 'Expected exactly one document/student foreign key.';END IF;
 SELECT * INTO dependency FROM pg_constraint WHERE conrelid='public.documents'::regclass
  AND confrelid='public.students'::regclass AND contype='f';
 IF dependency.confdeltype<>'c' OR dependency.conkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attname='student_id')]::smallint[]
 OR dependency.confkey<>ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.students'::regclass AND attname='id')]::smallint[] THEN
  RAISE EXCEPTION 'Expected canonical document/student cascade.';END IF;
 EXECUTE format('ALTER TABLE public.documents DROP CONSTRAINT %I',dependency.conname);
 EXECUTE format('ALTER TABLE public.documents ADD CONSTRAINT %I FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID',dependency.conname);
 IF dependency.convalidated THEN EXECUTE format('ALTER TABLE public.documents VALIDATE CONSTRAINT %I',dependency.conname);END IF;
END;$guard$;
-- Meetings currently have a soft student reference. Preserve their contents until
-- reviewed cleanup exists; do not silently erase meeting notes or child records.
ALTER TABLE public.meetings ADD CONSTRAINT meetings_student_cleanup_guard
 FOREIGN KEY(student_id) REFERENCES public.students(id) ON DELETE RESTRICT NOT VALID;
COMMIT;
