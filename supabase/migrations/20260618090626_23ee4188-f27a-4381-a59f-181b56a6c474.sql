
-- Meeting templates: shared library of agenda + checklist presets for IEP transition meetings
CREATE TABLE public.meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'PPT',
  recommended_band text,
  created_by uuid NOT NULL,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_templates TO authenticated;
GRANT ALL ON public.meeting_templates TO service_role;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View shared or own templates" ON public.meeting_templates
  FOR SELECT TO authenticated
  USING (
    is_shared = true
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Educators and admins can create templates" ON public.meeting_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'educator')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Creator or admin can update templates" ON public.meeting_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creator or admin can delete templates" ON public.meeting_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_meeting_templates_updated_at
  BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Template items: ordered agenda + checklist entries; optionally tied to a goal or compliance milestone
CREATE TABLE public.meeting_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.meeting_templates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  notes text,
  links_to text NOT NULL DEFAULT 'custom' CHECK (links_to IN ('custom','goal','compliance')),
  compliance_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_template_items_template ON public.meeting_template_items(template_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_template_items TO authenticated;
GRANT ALL ON public.meeting_template_items TO service_role;
ALTER TABLE public.meeting_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access items via template" ON public.meeting_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meeting_templates t
    WHERE t.id = template_id
      AND (t.is_shared = true OR t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Edit items via template" ON public.meeting_template_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meeting_templates t
    WHERE t.id = template_id
      AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Update items via template" ON public.meeting_template_items
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meeting_templates t
    WHERE t.id = template_id
      AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Delete items via template" ON public.meeting_template_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meeting_templates t
    WHERE t.id = template_id
      AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Extend meeting agenda items so each row can carry checklist state + linkage to a goal/compliance milestone
ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_compliance_key text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.meeting_templates(id) ON DELETE SET NULL;
