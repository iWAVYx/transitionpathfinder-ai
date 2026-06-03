CREATE TABLE public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.admin_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invited_by uuid NOT NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz
);

CREATE INDEX admin_invitations_email_idx ON public.admin_invitations (lower(email));
CREATE INDEX admin_invitations_token_idx ON public.admin_invitations (token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invitations TO authenticated;
GRANT ALL ON public.admin_invitations TO service_role;

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage invitations"
  ON public.admin_invitations FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));