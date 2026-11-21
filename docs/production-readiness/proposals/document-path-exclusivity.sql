-- CANONICAL REVIEW MIRROR: 20261029020000_document_path_exclusivity.sql.
-- Do not execute this mirror as an additional migration. Hosted authorization is separate.
-- First boundary: one document per nonempty object path, with fixed student/path.
-- Does not reserve content hashes, prove object ownership, freeze stored bytes,
-- or authorize deletion. Existing row/table permissions remain unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;

DO $path_preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.documents'::regclass
      AND tgname = 'documents_enforce_storage_path' AND NOT tgisinternal AND tgenabled = 'O'
      AND tgfoid = 'public.tg_documents_enforce_storage_path()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'The reviewed document path trigger is required before this change.' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.documents
    WHERE storage_path IS NOT NULL AND storage_path <> ''
    GROUP BY storage_path HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing document path collisions require review; no rows were changed.' USING ERRCODE = '23505';
  END IF;
END;
$path_preflight$;

CREATE UNIQUE INDEX documents_storage_path_unique
  ON public.documents (storage_path)
  WHERE storage_path IS NOT NULL AND storage_path <> '';

CREATE OR REPLACE FUNCTION public.tg_documents_enforce_storage_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $document_identity$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
      RAISE EXCEPTION 'A saved document cannot be moved to another student or file location.' USING ERRCODE = '42501';
    END IF;
    -- Preserve legacy locations without rewriting them during metadata updates.
    RETURN NEW;
  END IF;
  IF NEW.student_id IS NULL OR NEW.storage_path IS NULL
     OR char_length(NEW.storage_path) > 500
     OR NEW.storage_path !~ ('^' || NEW.student_id::text || '/[A-Za-z0-9._-]+$')
     OR split_part(NEW.storage_path, '/', 2) IN ('.', '..') THEN
    RAISE EXCEPTION 'The file location must match this student.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$document_identity$;

-- Trigger invocation does not require client RPC execution permission.
REVOKE ALL ON FUNCTION public.tg_documents_enforce_storage_path()
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
