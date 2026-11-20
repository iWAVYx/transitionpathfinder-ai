/** A refused link is not proof that a student relationship was revoked. */
export function documentAccessReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  if (reason === "revoked_access" || reason === "revoked_access_signed_url_attempt") return "Access was recorded as removed.";
  if (reason === "unconfirmed_access_or_file_state") return "Access or file status could not be confirmed.";
  return "Review the access attempt.";
}
