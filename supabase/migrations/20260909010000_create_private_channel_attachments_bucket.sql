-- Keep the Transition Channel attachment bucket in the canonical migration
-- history. Earlier migrations installed its object policies but assumed that
-- the bucket had already been created through a hosted dashboard.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-attachments', 'channel-attachments', false)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Fail closed if a hosted environment cannot create the bucket or preserve
-- its private access boundary.
DO $verify_private_channel_attachments_bucket$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'channel-attachments'
      AND name = 'channel-attachments'
      AND public IS FALSE
  ) THEN
    RAISE EXCEPTION 'Private channel-attachments bucket is missing';
  END IF;
END;
$verify_private_channel_attachments_bucket$;

COMMIT;
