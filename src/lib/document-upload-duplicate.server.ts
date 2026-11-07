import { isAuthorized } from "./authz";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { documentUploadFingerprint } from "./document-upload-fingerprint";
import { documentUploadOutcome } from "./document-upload-outcome";
import { assertPrivacySafeDerivedUpload } from "./sensitive-text-redaction";

/** Uses only the authorized caller's reads. Legacy/index hashes are hints:
 * verify stored bytes before treating an accessible candidate as a duplicate.
 * Existing authorization denial auditing still applies. This check does not
 * reserve content against concurrent uploads. */
export async function hasVerifiedDocumentDuplicate(supabase: SupabaseClient<Database>, userId: string, studentId: string, fingerprint: string) {
  try {
    const result = await supabase.from("documents").select("*")
      .eq("student_id", studentId).eq("content_hash", fingerprint.toLowerCase())
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (result.error !== null || result.data === undefined) throw new Error("Unconfirmed duplicate query");
    if (result.data === null) return false;
    const row = result.data;
    if (row.student_id !== studentId || typeof row.storage_path !== "string" ||
        row.storage_path.split("/").length !== 2 || !row.storage_path.startsWith(`${studentId}/`) ||
        documentUploadOutcome(row, studentId, row.storage_path) === "uncertain") {
      throw new Error("Unconfirmed document candidate");
    }
    // Old original-file formats are not interchangeable with reviewed text copies.
    try { assertPrivacySafeDerivedUpload(row.storage_path, row.mime_type); } catch { return false; }
    // Student edit access alone does not replace document-specific view access.
    if (!await isAuthorized({ supabase, userId, action: "view", resourceType: "document", resourceId: row.id })) return false;
    const stored = await supabase.storage.from("student-documents").download(row.storage_path);
    if (stored.error || !stored.data) throw new Error("Unconfirmed stored bytes");
    return await documentUploadFingerprint(stored.data) === fingerprint.toLowerCase();
  } catch {
    throw new Error("We couldn't check whether this file is already saved. Refresh the page and review the document list before uploading again.");
  }
}

/** Called only after authenticated student edit/partner checks and canonical
 * path validation. Probe across RLS so a hidden document cannot have its object
 * borrowed for another registration, scan or infected-file removal. No row or
 * existence detail is returned to the caller. This is not a concurrency lock. */
export async function assertDocumentUploadPathAvailable(admin: SupabaseClient<Database>, path: string) {
  try {
    const existing = await admin.from("documents").select("id").eq("storage_path", path).limit(1).maybeSingle();
    if (existing.error !== null || existing.data !== null) throw new Error("Unconfirmed unused upload path");
  } catch {
    throw new Error("This upload location is already in use or could not be confirmed. Refresh the page and review the document list before uploading again.");
  }
}
