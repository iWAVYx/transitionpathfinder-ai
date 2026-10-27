-- REVIEW PROPOSAL ONLY. Not canonical or authorized for hosted execution.
-- Blocks ordinary client replacement, moves and deletion in student-documents.
-- Does not prove object ownership, immutable service writes or provider scanning.
-- Use Storage APIs for byte operations; never delete storage metadata as cleanup.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $storage_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
    WHERE oid='storage.objects'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Storage row security is required.' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid='storage.objects'::regclass AND polname='Upload student docs'
      AND polcmd='a' AND polpermissive) THEN
    RAISE EXCEPTION 'The reviewed student upload policy is required.' USING ERRCODE='55000';
  END IF;
END;
$storage_preflight$;

-- Restrictive policies also constrain any other permissive client policy.
-- USING protects old rows; WITH CHECK prevents moving another bucket into this
-- bucket. Client deletion stays blocked even before registration or after archive.
CREATE POLICY student_document_no_client_replace ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id IS DISTINCT FROM 'student-documents')
  WITH CHECK (bucket_id IS DISTINCT FROM 'student-documents');
CREATE POLICY student_document_no_client_delete ON storage.objects
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id IS DISTINCT FROM 'student-documents');
COMMIT;
