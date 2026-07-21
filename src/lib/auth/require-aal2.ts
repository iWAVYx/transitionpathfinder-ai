// Slice 3 (A-05): MFA enforcement helper for privileged admin server fns.
//
// Supabase issues JWTs with an `aal` claim ("aal1" for password-only sessions,
// "aal2" once the user has completed a TOTP challenge in the current session).
// The `amr` claim additionally lists the authentication methods used.
//
// This helper throws a clear, safe error when the caller's session is not
// AAL2. It is intended to wrap `.handler` bodies of server fns that mutate
// `admin_roles` / `admin_invitations` so a compromised password alone cannot
// grant or revoke platform-admin access.

export type AuthClaims = {
  aal?: string | null;
  amr?: Array<{ method?: string | null } | string> | null;
} & Record<string, unknown>;

export function isAal2(claims: AuthClaims | null | undefined): boolean {
  if (!claims) return false;
  if (claims.aal === "aal2") return true;
  const amr = claims.amr;
  if (Array.isArray(amr)) {
    for (const entry of amr) {
      const method =
        typeof entry === "string" ? entry : (entry?.method ?? "");
      if (method === "totp" || method === "mfa/totp" || method === "webauthn") {
        return true;
      }
    }
  }
  return false;
}

/**
 * Throw with an app-safe message when the caller's session has not completed
 * an MFA challenge. Never surface token internals in the message.
 */
export function requireAal2(claims: AuthClaims | null | undefined): void {
  if (!isAal2(claims)) {
    const err = new Error(
      "MFA required: this action needs a two-factor challenge. Please complete verification and try again.",
    );
    // Marker for UI to route the user to /login/2fa or the challenge screen.
    (err as Error & { code?: string }).code = "mfa_required";
    throw err;
  }
}
