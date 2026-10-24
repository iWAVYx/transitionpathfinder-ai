import { z } from "zod";
import { viewerIntentSchema } from "@/lib/viewer-intent";

export const OUTREACH_STATUSES = [
  "not_contacted",
  "contacted",
  "meeting_scheduled",
  "demo_completed",
  "interested",
  "not_interested",
  "follow_up_needed",
] as const;
const date = z.string().datetime({ offset: true });
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();
export const outreachInputSchema = z
  .object({
    ...viewerIntentSchema.shape,
    id: z.string().uuid().optional(),
    expected_updated_at: date.optional(),
    contact_name: z.string().trim().min(1).max(200),
    organization: text(200),
    role_type: text(120),
    phone: text(50),
    email: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() || null : value),
      z.string().email().max(255).nullable().optional(),
    ),
    relationship_notes: text(2000),
    notes: text(5000),
    outreach_status: z.enum(OUTREACH_STATUSES).optional(),
    last_contacted_at: date.nullable().optional(),
    next_follow_up_at: date.nullable().optional(),
  })
  .refine((value) => !value.expected_updated_at || !!value.id, "A recorded contact is required.");
export const outreachRowSchema = z.object({
  id: z.string().uuid(),
  contact_name: z.string().min(1),
  organization: z.string().nullable(),
  role_type: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  relationship_notes: z.string().nullable(),
  notes: z.string().nullable(),
  outreach_status: z.enum(OUTREACH_STATUSES),
  last_contacted_at: date.nullable(),
  next_follow_up_at: date.nullable(),
  created_at: date,
  updated_at: date,
});
export type OutreachRow = z.infer<typeof outreachRowSchema>;
