CREATE TABLE public.report_evidence_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  report_section TEXT NOT NULL CHECK (report_section IN (
    'snapshot','student_voice','family_priorities','educator_input','documents',
    'readiness','pathways','self_advocacy','independent_living','plan_30_60_90',
    'questions_for_team','partner_matches'
  )),
  source_kind TEXT NOT NULL CHECK (source_kind IN (
    'document','note','goal','meeting','voice_response','assessment','opportunity','other'
  )),
  source_id UUID,
  source_label TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX report_evidence_links_student_idx ON public.report_evidence_links (student_id, report_section);
CREATE INDEX report_evidence_links_source_idx ON public.report_evidence_links (source_kind, source_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_evidence_links TO authenticated;
GRANT ALL ON public.report_evidence_links TO service_role;

ALTER TABLE public.report_evidence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View evidence for students you can access"
  ON public.report_evidence_links FOR SELECT
  TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "Add evidence for students you can edit"
  ON public.report_evidence_links FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "Update evidence for students you can edit"
  ON public.report_evidence_links FOR UPDATE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id))
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "Delete evidence for students you can edit"
  ON public.report_evidence_links FOR DELETE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER report_evidence_links_set_updated_at
  BEFORE UPDATE ON public.report_evidence_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
