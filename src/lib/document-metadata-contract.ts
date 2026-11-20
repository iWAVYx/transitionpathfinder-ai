import { z } from "zod";
export const DOC_TYPES = ["iep","current-iep","previous-iep","evaluation","transition-plan","progress-report","meeting-notes","other"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOCUMENT_METADATA_MESSAGE = "We couldn't confirm these document details. Refresh them to check your sign-in, access and the latest version before continuing.";
const viewer = { expected_viewer_id: z.string().uuid() };
const identity = z.object({ ...viewer, id: z.string().uuid(), student_id: z.string().uuid(), expected_updated_at: z.string().datetime({ offset: true }) });
export const documentMetadataRead = z.object({ ...viewer, document_id: z.string().uuid() }).strict();
export const documentClassificationEdit = identity.extend({ doc_type: z.enum(DOC_TYPES) }).strict();
export const documentReviewedEdit = identity.extend({ reviewed: z.boolean() }).strict();
export function parseDocumentMetadata(input: unknown, kind: "read"|"classify"|"review") {
  try { return (kind === "read" ? documentMetadataRead : kind === "classify" ? documentClassificationEdit : documentReviewedEdit).parse(input); }
  catch { throw new Error(DOCUMENT_METADATA_MESSAGE); }
}
export const documentMetadataRow = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), title: z.string(), doc_type: z.string(), updated_at: z.string().datetime({ offset: true }), reviewed_at: z.string().datetime({ offset: true }).nullable(), reviewed_by: z.string().uuid().nullable(), used_in_report_at: z.string().datetime({ offset: true }).nullable(), archived_at: z.string().nullable(), deleted_at: z.null() });
export type DocumentMetaRow = z.infer<typeof documentMetadataRow> & { can_edit: boolean };
