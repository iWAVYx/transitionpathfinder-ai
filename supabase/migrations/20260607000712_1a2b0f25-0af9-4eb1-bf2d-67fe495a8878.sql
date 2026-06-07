
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  link_url text CHECK (link_url IS NULL OR length(link_url) <= 1000),
  link_label text CHECK (link_label IS NULL OR length(link_label) <= 100),
  target_roles text[] NOT NULL DEFAULT ARRAY['all']::text[],
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  published boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Users view targeted published announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    published = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      'all' = ANY(target_roles)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text = ANY(target_roles)
      )
    )
  );

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_announcements_published ON public.announcements(published, expires_at);

CREATE TABLE public.announcement_dismissals (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals - select"
  ON public.announcement_dismissals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own dismissals - insert"
  ON public.announcement_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own dismissals - delete"
  ON public.announcement_dismissals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
