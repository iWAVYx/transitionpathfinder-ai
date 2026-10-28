import { z } from "zod";
import { viewerIntentSchema } from "./viewer-intent";
export const documentUploadDetailsSchema = z.object({
  student_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  mime_type: z.string().trim().max(120).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  doc_type: z
    .enum([
      "iep",
      "current-iep",
      "previous-iep",
      "evaluation",
      "transition-plan",
      "progress-report",
      "meeting-notes",
      "other",
    ])
    .default("current-iep"),
  visibility: z.enum(["private", "team", "family", "student"]).default("team"),
  school_year: z.string().trim().max(20).optional(),
  meeting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  annual_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reevaluation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(200).optional(),
  consent_acknowledged: z.boolean().default(false),
  content_hash: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i)
    .transform((value) => value.toLowerCase()),
});
export const documentUploadReservationRequestSchema = documentUploadDetailsSchema.extend({
  attempt_id: z.string().uuid(),
  ...viewerIntentSchema.shape,
});
export const documentUploadRecoveryRequestSchema = documentUploadReservationRequestSchema.extend({
  review_context_sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const documentRegistrationRequestSchema = documentUploadDetailsSchema
  .extend({
    storage_path: z.string().trim().min(1).max(500),
    upload_attempt_id: z.string().uuid(),
    upload_review_context_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    ...viewerIntentSchema.shape,
  })
  .refine(
    (data) =>
      data.storage_path ===
      `${data.student_id}/${data.upload_attempt_id}-privacy-safe-document.txt`,
    {
      message: "The uploaded file does not match this student. Refresh the page before continuing.",
      path: ["storage_path"],
    },
  );
export const documentUploadReservationSchema = z.object({
  schema: z.literal("document-upload-reservation-v1"),
  attempt_id: z.string().uuid(),
  student_id: z.string().uuid(),
  actor_id: z.string().min(1),
  storage_path: z.string(),
  state: z.literal("reserved"),
  review_context_sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export function confirmDocumentUploadReservation(
  value: unknown,
  actor: string,
  student: string,
  attempt: string,
) {
  const row = documentUploadReservationSchema.parse(value);
  if (
    row.actor_id !== actor ||
    row.student_id !== student ||
    row.attempt_id !== attempt ||
    row.storage_path !== `${student}/${attempt}-privacy-safe-document.txt`
  )
    throw new Error("The upload reservation could not be confirmed.");
  return row;
}
/** Intent identity, not proof of consent, redaction, malware safety or stored bytes. */
export async function documentUploadReviewHash(actor: string, input: unknown) {
  const details = documentUploadDetailsSchema.parse(input);
  const bytes = new TextEncoder().encode(
    JSON.stringify({ schema: "document-upload-review-v1", actor, ...details }),
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
