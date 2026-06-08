
-- Alerts table for IEP signed-URL access attempts on revoked/missing access.
CREATE TABLE public.iep_access_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  document_id uuid,
  reason text NOT NULL,
  metadata jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.iep_access_alerts TO authenticated;
GRANT ALL ON public.iep_access_alerts TO service_role;

ALTER TABLE public.iep_access_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read iep alerts"
  ON public.iep_access_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins acknowledge iep alerts"
  ON public.iep_access_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_iep_alerts_student ON public.iep_access_alerts(student_id);
CREATE INDEX idx_iep_alerts_created ON public.iep_access_alerts(created_at DESC);
CREATE INDEX idx_iep_alerts_unack ON public.iep_access_alerts(created_at DESC) WHERE acknowledged_at IS NULL;
