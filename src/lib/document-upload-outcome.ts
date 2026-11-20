import { z } from "zod";

const receiptSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  storage_path: z.string(),
  scan_status: z.enum(["pending", "clean", "infected", "failed", "deleted"]),
  review_status: z.string().min(1),
  archived_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
});

/** Only a complete receipt for this exact upload can confirm its status.
 * A clean scan is not approval of the document's educational content. */
export function documentUploadOutcome(value: unknown, studentId: string, storagePath: string) {
  const parsed = receiptSchema.safeParse(value);
  if (!parsed.success) return "uncertain" as const;
  const row = parsed.data;
  if (row.student_id !== studentId || row.storage_path !== storagePath) return "uncertain" as const;
  if (row.archived_at !== null || row.deleted_at !== null || row.review_status === "rejected" ||
      ["infected", "failed", "deleted"].includes(row.scan_status)) return "blocked" as const;
  return row.scan_status === "clean" ? "saved" as const : "pending" as const;
}

export const DOCUMENT_UPLOAD_UNCONFIRMED = "We couldn't confirm the upload status. Refresh this page and review the document list before uploading again.";
