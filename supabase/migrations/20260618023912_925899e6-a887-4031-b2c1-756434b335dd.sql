
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS interest_type text;

ALTER TABLE public.waitlist
  DROP CONSTRAINT IF EXISTS waitlist_interest_type_check;

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_interest_type_check
  CHECK (
    interest_type IS NULL OR interest_type IN (
      'family_early_access',
      'educator_access',
      'school_pilot',
      'district_pilot',
      'partner_interest',
      'demo_request'
    )
  );

-- Replace the public INSERT policy so submissions can include the new fields
-- and the previously added org/school/district/intended_use columns. Still
-- bounded by length checks to prevent abuse.
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist;

CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(email) BETWEEN 3 AND 255
  AND length(full_name) BETWEEN 1 AND 200
  AND length(role) BETWEEN 1 AND 50
  AND (state IS NULL OR length(state) <= 100)
  AND (student_grade_band IS NULL OR length(student_grade_band) <= 50)
  AND (reason IS NULL OR length(reason) <= 2000)
  AND (interest_type IS NULL OR length(interest_type) <= 50)
  AND (organization_name IS NULL OR length(organization_name) <= 200)
  AND (organization_type IS NULL OR length(organization_type) <= 100)
  AND (district_name IS NULL OR length(district_name) <= 200)
  AND (school_name IS NULL OR length(school_name) <= 200)
  AND (intended_use IS NULL OR length(intended_use) <= 2000)
  AND (referral_source IS NULL OR length(referral_source) <= 200)
);
