CREATE TABLE public.user_ui_prefs (
  user_id uuid NOT NULL PRIMARY KEY,
  report_viewer jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ui_prefs TO authenticated;
GRANT ALL ON public.user_ui_prefs TO service_role;

ALTER TABLE public.user_ui_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ui prefs"
  ON public.user_ui_prefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ui prefs"
  ON public.user_ui_prefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ui prefs"
  ON public.user_ui_prefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ui prefs"
  ON public.user_ui_prefs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_user_ui_prefs_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_user_ui_prefs_updated_at
  BEFORE UPDATE ON public.user_ui_prefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_ui_prefs_touch_updated_at();