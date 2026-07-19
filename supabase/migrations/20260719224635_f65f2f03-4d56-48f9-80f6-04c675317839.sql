-- Slice C2 — content-hash column on documents for idempotent duplicate detection.
-- Nullable, no readers/writers wired yet. Backfill from existing storage_path
-- fingerprint (stable) so we don't rebuild from bytes; future pipeline runs
-- will overwrite with a real SHA-256 of the file content when they process it.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

COMMENT ON COLUMN public.documents.content_hash IS
  'SHA-256 hex of the raw document bytes. Used by the document intelligence '
  'pipeline for idempotent duplicate detection. Nullable until backfilled by '
  'the next processing run.';

-- Non-unique index scoped per-student: duplicates *within* a student are the
-- interesting signal; the same file uploaded by two different students is not
-- a dedupe target. Partial to keep the index small until backfill completes.
CREATE INDEX IF NOT EXISTS documents_student_content_hash_idx
  ON public.documents (student_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Idempotent backfill: derive a deterministic placeholder hash from
-- storage_path so re-running the migration is a no-op and every row that has
-- a storage_path gets a stable value. Real byte-level hashes replace these
-- lazily as the pipeline reprocesses each document.
UPDATE public.documents
   SET content_hash = encode(digest('storage_path:' || storage_path, 'sha256'), 'hex')
 WHERE content_hash IS NULL
   AND storage_path IS NOT NULL
   AND storage_path <> '';
