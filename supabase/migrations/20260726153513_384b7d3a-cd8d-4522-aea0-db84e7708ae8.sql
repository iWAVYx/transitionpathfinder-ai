
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scan_verdict jsonb,
  ADD COLUMN IF NOT EXISTS scan_data_id text,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_scan_status_chk;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_scan_status_chk
  CHECK (scan_status = ANY (ARRAY['pending','clean','infected','failed','deleted']));

CREATE INDEX IF NOT EXISTS documents_scan_status_idx
  ON public.documents (scan_status);

ALTER TABLE public.document_pipeline_runs
  DROP CONSTRAINT IF EXISTS document_pipeline_runs_stage_check;
ALTER TABLE public.document_pipeline_runs
  ADD CONSTRAINT document_pipeline_runs_stage_check
  CHECK (stage = ANY (ARRAY['upload','sniff','hash','av_scan','sanitize','extract','verify','publish']));
