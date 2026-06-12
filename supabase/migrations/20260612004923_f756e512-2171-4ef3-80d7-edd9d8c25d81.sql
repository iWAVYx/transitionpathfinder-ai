
-- Add new permission level
ALTER TYPE public.document_permission_level
  ADD VALUE IF NOT EXISTS 'view_student_friendly_summary' AFTER 'view_summary';

-- can_view_document already returns true for any permission_level <> 'none',
-- so no helper change is needed for the new value to grant access. We surface
-- the distinction in application code (StudentFriendlyDocumentSummary).
