export const MAX_PRIVACY_SAFE_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** Content identity only, not proof of redaction or malware safety. */
export async function documentUploadFingerprint(blob: Blob): Promise<string> {
  if (blob.size < 1 || blob.size > MAX_PRIVACY_SAFE_DOCUMENT_BYTES) throw new Error("Invalid upload size");
  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_PRIVACY_SAFE_DOCUMENT_BYTES) throw new Error("Invalid upload size");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
