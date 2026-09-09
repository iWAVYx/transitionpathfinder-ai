/**
 * Temporary production safety gate for user-supplied files that require
 * private malware scanning.
 *
 * Keep this code-owned and fail closed. Enabling it requires a reviewed code
 * change after the private scanner has passed the protected clean/EICAR proof.
 * It intentionally does not affect owner-managed public site media.
 */
export const PROTECTED_FILE_UPLOADS_ENABLED = false;

export const PROTECTED_FILE_UPLOADS_MESSAGE =
  "File uploads are temporarily unavailable while private malware scanning is being finalized.";

export function assertProtectedFileUploadsEnabled(): void {
  if (!PROTECTED_FILE_UPLOADS_ENABLED) {
    throw new Error(PROTECTED_FILE_UPLOADS_MESSAGE);
  }
}
