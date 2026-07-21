-- Slice 1 waitlist go/no-go: prevent duplicate active waitlist submissions
-- by adding a unique partial index on lower(email). We scope it to rows that
-- haven't been rejected/archived so an admin can re-open a closed row without
-- blocking legitimate re-applies after archival.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_active_email_uidx
  ON public.waitlist (lower(email))
  WHERE status NOT IN ('rejected','archived');