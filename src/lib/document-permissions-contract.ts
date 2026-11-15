import { z } from "zod";

export const DOCUMENT_PERMISSIONS_UNCONFIRMED = "We couldn't confirm these document grants. Refresh the list to check your sign-in, access and the latest details before continuing.";
const timestamp = z.string().datetime({ offset: true });
export const documentPermissionIntent = z.object({
  document_id: z.string().uuid(),
  student_id: z.string().uuid(),
  expected_viewer_id: z.string().uuid(),
  expected_document_updated_at: timestamp,
}).strict();
// Only full-document sharing is supported by the current document-view policy.
// Cached callers may not create misleading summary/edit/manage or role-wide grants.
export const documentPermissionGrant = documentPermissionIntent.extend({
  user_email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  permission_level: z.literal("view_document"),
  acknowledge_full_document: z.literal(true),
}).strict();
export const documentPermissionRemoval = documentPermissionIntent.extend({
  id: z.string().uuid(),
  expected_permission_updated_at: timestamp,
}).strict();
export const documentPermissionRow = z.object({
  id: z.string().uuid(), document_id: z.string().uuid(), student_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(), role_type: z.string().nullable(),
  permission_level: z.enum(["none", "view_summary", "view_student_friendly_summary", "view_document", "edit_metadata", "manage", "download_document", "request_summary", "review_document"]),
  granted_by: z.string().uuid(), notes: z.string().nullable(), created_at: timestamp, updated_at: timestamp,
}).refine(row => (row.user_id !== null) !== (row.role_type !== null));
export type DocumentPermissionRow = z.infer<typeof documentPermissionRow>;
export type PermissionIntent = z.infer<typeof documentPermissionIntent>;
export function parseDocumentPermissionRequest(input: unknown, kind: "list" | "grant" | "remove") {
  try { return (kind === "list" ? documentPermissionIntent : kind === "grant" ? documentPermissionGrant : documentPermissionRemoval).parse(input); }
  catch { throw new Error(DOCUMENT_PERMISSIONS_UNCONFIRMED); }
}
