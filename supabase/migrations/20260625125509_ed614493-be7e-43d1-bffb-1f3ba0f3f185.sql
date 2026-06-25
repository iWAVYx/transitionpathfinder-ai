-- Phase 1: additive columns for deeper intake + document-sourced report insights.
-- All columns nullable; no destructive changes; RLS/GRANTs unchanged.

ALTER TABLE public.student_intakes
  ADD COLUMN IF NOT EXISTS communication_prefs text,
  ADD COLUMN IF NOT EXISTS transportation_needs text,
  ADD COLUMN IF NOT EXISTS family_priorities text,
  ADD COLUMN IF NOT EXISTS family_concerns_extended text,
  ADD COLUMN IF NOT EXISTS student_worries text,
  ADD COLUMN IF NOT EXISTS services_received text,
  ADD COLUMN IF NOT EXISTS desired_postsecondary_outcomes text,
  ADD COLUMN IF NOT EXISTS upcoming_meetings text;

ALTER TABLE public.document_extractions
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS source_label text;
