
-- Extend partner verification status with two more lifecycle states the
-- recommender filters use.
ALTER TYPE public.partner_verification_status ADD VALUE IF NOT EXISTS 'community_resource';
ALTER TYPE public.partner_verification_status ADD VALUE IF NOT EXISTS 'outdated';

-- Add a review_status column to resources so the recommender can hide
-- archived/outdated content and surface a clear badge in the UI.
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_review_status_check;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_review_status_check
  CHECK (review_status IN (
    'verified','needs_review','community_resource','potential','archived','outdated'
  ));

CREATE INDEX IF NOT EXISTS resources_review_status_idx
  ON public.resources (review_status);
