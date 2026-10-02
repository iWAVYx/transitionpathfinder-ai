import { z } from "zod";

export const OPPORTUNITY_EDIT_TYPES = [
  "college_program",
  "technical_school",
  "certificate_program",
  "employer",
  "internship",
  "mentorship",
  "job_shadowing",
  "agency_support",
  "community_resource",
] as const;

export const opportunityEditFields = z.object({
  title: z.string().trim().min(2, "Enter a title of at least two characters.").max(200),
  description: z.string().trim().max(2000),
  opportunity_type: z.enum(OPPORTUNITY_EDIT_TYPES),
  location: z.string().trim().max(200),
  age_range: z.string().trim().max(60),
  eligibility: z.string().trim().max(500),
  application_url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (!value) return true;
      try {
        return ["https:", "http:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Enter a complete http:// or https:// application link."),
  contact_email: z.union([z.string().trim().email().max(200), z.literal("")]),
});

export type OpportunityEditFields = z.infer<typeof opportunityEditFields>;
export const opportunityEditSchema = opportunityEditFields
  .extend({
    id: z.string().uuid(),
    expected_updated_at: z.string().datetime({ offset: true }),
  })
  .strict();
