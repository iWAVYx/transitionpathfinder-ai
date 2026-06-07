
CREATE TABLE public.announcement_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('view','click')),
  role text,
  link_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ann_events_ann ON public.announcement_events(announcement_id);
CREATE INDEX idx_ann_events_user ON public.announcement_events(user_id);
CREATE INDEX idx_ann_events_type ON public.announcement_events(event_type);

-- Prevent duplicate "view" rows per user per announcement (clicks may repeat)
CREATE UNIQUE INDEX uniq_ann_view_per_user
  ON public.announcement_events(announcement_id, user_id)
  WHERE event_type = 'view';

GRANT SELECT, INSERT ON public.announcement_events TO authenticated;
GRANT ALL ON public.announcement_events TO service_role;

ALTER TABLE public.announcement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON public.announcement_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own events"
  ON public.announcement_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Platform admins view all events"
  ON public.announcement_events FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
