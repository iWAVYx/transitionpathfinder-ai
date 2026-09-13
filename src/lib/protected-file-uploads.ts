import { appEnv, projectRefFrom, STAGING_PROJECT_REF } from "./env-identity";

export interface ProtectedFileUploadsPolicyInput {
  appEnv: string | null | undefined;
  supabaseUrl: string | null | undefined;
}

/**
 * Protected uploads stay fail closed everywhere except the isolated staging
 * deployment used to prove the private malware-scanning path. Both the
 * environment label and database identity must match; neither is sufficient
 * on its own. Production will require a separate reviewed code change after
 * the staging proof and operational approvals are complete.
 *
 * This gate intentionally does not affect owner-managed public site media.
 */
export function resolveProtectedFileUploadsEnabled(
  input: ProtectedFileUploadsPolicyInput,
): boolean {
  return input.appEnv === "staging" && projectRefFrom(input.supabaseUrl) === STAGING_PROJECT_REF;
}

export const PROTECTED_FILE_UPLOADS_ENABLED = resolveProtectedFileUploadsEnabled({
  appEnv: appEnv(),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
});

export const PROTECTED_FILE_UPLOADS_MESSAGE =
  "File uploads are temporarily unavailable while private malware scanning is being finalized.";

export function assertProtectedFileUploadsEnabled(): void {
  if (!PROTECTED_FILE_UPLOADS_ENABLED) {
    throw new Error(PROTECTED_FILE_UPLOADS_MESSAGE);
  }
}
