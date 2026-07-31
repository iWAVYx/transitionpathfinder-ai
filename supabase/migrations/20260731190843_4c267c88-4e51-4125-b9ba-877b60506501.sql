-- Phase 1: exceptional access hardening for student documents.

ALTER TABLE public.admin_doc_access_grants
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'single_document',
  ADD COLUMN IF NOT EXISTS case_reference text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revoked_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_doc_access_grants_scope_check'
  ) THEN
    ALTER TABLE public.admin_doc_access_grants
      ADD CONSTRAINT admin_doc_access_grants_scope_check
      CHECK (scope IN ('single_document','compliance_audit','support_ticket','data_request'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_doc_access_grants_active_idx
  ON public.admin_doc_access_grants (expires_at DESC)
  WHERE revoked_at IS NULL;

-- Revoked grants must stop working immediately.
CREATE OR REPLACE FUNCTION public.has_recent_admin_doc_access(_user_id uuid, _document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id) AND EXISTS (
    SELECT 1 FROM public.admin_doc_access_grants
    WHERE actor_id = _user_id
      AND document_id = _document_id
      AND expires_at > now()
      AND revoked_at IS NULL
  );
$$;

-- The grant log is append-only, except for revocation by a platform admin.
CREATE OR REPLACE FUNCTION public.tg_admin_doc_access_grants_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Exceptional access grants are permanent audit records and cannot be deleted'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.document_id IS DISTINCT FROM OLD.document_id
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.scope IS DISTINCT FROM OLD.scope
     OR NEW.case_reference IS DISTINCT FROM OLD.case_reference
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'Exceptional access grants are immutable; only revocation is permitted'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'This grant has already been revoked' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_doc_access_grants_immutable ON public.admin_doc_access_grants;
CREATE TRIGGER admin_doc_access_grants_immutable
  BEFORE UPDATE OR DELETE ON public.admin_doc_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.tg_admin_doc_access_grants_immutable();

DROP POLICY IF EXISTS admin_doc_access_grants_admin_revoke ON public.admin_doc_access_grants;
CREATE POLICY admin_doc_access_grants_admin_revoke
  ON public.admin_doc_access_grants
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.admin_doc_access_grants TO authenticated;
GRANT ALL ON public.admin_doc_access_grants TO service_role;