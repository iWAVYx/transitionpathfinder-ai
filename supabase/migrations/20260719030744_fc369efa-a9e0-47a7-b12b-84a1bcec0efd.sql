-- Workstream B, Slice B1: dormant evidence graph tables.
-- Additive only; no reads/writes from app code yet.

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind text NOT NULL,
  subject_type text,
  subject_id uuid,
  source_kind text NOT NULL,
  source_id uuid,
  contributor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at timestamptz,
  confidence numeric(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  verification_state text NOT NULL DEFAULT 'unverified',
  permission_scope text NOT NULL DEFAULT 'student_team',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_id uuid REFERENCES public.document_extractions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_items view via student access"
  ON public.evidence_items FOR SELECT
  TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "evidence_items insert via student edit"
  ON public.evidence_items FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "evidence_items update via student edit"
  ON public.evidence_items FOR UPDATE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id))
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "evidence_items delete via student edit"
  ON public.evidence_items FOR DELETE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE INDEX IF NOT EXISTS evidence_items_student_idx ON public.evidence_items(student_id);
CREATE INDEX IF NOT EXISTS evidence_items_kind_idx ON public.evidence_items(kind);
CREATE INDEX IF NOT EXISTS evidence_items_subject_idx ON public.evidence_items(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS evidence_items_source_idx ON public.evidence_items(source_kind, source_id);

CREATE TRIGGER evidence_items_touch_updated_at
  BEFORE UPDATE ON public.evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Edges: evidence -> recommendation/action/opportunity/outcome/report_version.
-- from_type/from_id references an evidence_item; to_type/to_id references
-- the linked domain object. We do NOT foreign-key the polymorphic sides;
-- integrity is enforced by the writer and by the visibility gate below.
CREATE TABLE IF NOT EXISTS public.evidence_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  relation text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_type, from_id, to_type, to_id, relation)
);

GRANT SELECT, INSERT, DELETE ON public.evidence_edges TO authenticated;
GRANT ALL ON public.evidence_edges TO service_role;

ALTER TABLE public.evidence_edges ENABLE ROW LEVEL SECURITY;

-- Edge visibility is derived from the evidence_item on the "from" side:
-- if the caller can see that evidence item, they can see edges attached to it.
CREATE POLICY "evidence_edges view via evidence access"
  ON public.evidence_edges FOR SELECT
  TO authenticated
  USING (
    from_type = 'evidence_item'
    AND EXISTS (
      SELECT 1 FROM public.evidence_items ei
      WHERE ei.id = evidence_edges.from_id
        AND public.can_access_student(auth.uid(), ei.student_id)
    )
  );

CREATE POLICY "evidence_edges insert via evidence edit"
  ON public.evidence_edges FOR INSERT
  TO authenticated
  WITH CHECK (
    from_type = 'evidence_item'
    AND EXISTS (
      SELECT 1 FROM public.evidence_items ei
      WHERE ei.id = evidence_edges.from_id
        AND public.can_edit_student(auth.uid(), ei.student_id)
    )
  );

CREATE POLICY "evidence_edges delete via evidence edit"
  ON public.evidence_edges FOR DELETE
  TO authenticated
  USING (
    from_type = 'evidence_item'
    AND EXISTS (
      SELECT 1 FROM public.evidence_items ei
      WHERE ei.id = evidence_edges.from_id
        AND public.can_edit_student(auth.uid(), ei.student_id)
    )
  );

CREATE INDEX IF NOT EXISTS evidence_edges_from_idx ON public.evidence_edges(from_type, from_id);
CREATE INDEX IF NOT EXISTS evidence_edges_to_idx ON public.evidence_edges(to_type, to_id);
CREATE INDEX IF NOT EXISTS evidence_edges_relation_idx ON public.evidence_edges(relation);