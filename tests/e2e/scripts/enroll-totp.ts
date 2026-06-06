/**
 * One-time helper: seeds a known TOTP secret for the E2E test user so the
 * Playwright 2FA spec can generate valid codes deterministically with
 * `otplib`. Run locally with:
 *
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   E2E_USER_EMAIL=... \
 *   bun tests/e2e/scripts/enroll-totp.ts
 *
 * Outputs a base32 secret — store it as `E2E_TOTP_SECRET` (GitHub Action
 * secret + local `.env` for dev). Re-running rotates the secret.
 *
 * NOTE: This script intentionally lives OUTSIDE the app bundle and is not
 * imported by any client code. It uses the service-role key, which must
 * never leak into the browser.
 */
import { createClient } from "@supabase/supabase-js";
import { authenticator } from "otplib";

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!url || !serviceKey || !email || !password) {
    console.error(
      "Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_USER_EMAIL, E2E_USER_PASSWORD",
    );
    process.exit(1);
  }

  // Sign in as the test user to get a regular session — MFA enroll/verify
  // calls run as the user, not as the service role.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userClient = createClient(
    url,
    process.env.SUPABASE_ANON_KEY ?? serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: signIn, error: signInErr } =
    await userClient.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.user) {
    console.error("Sign-in failed:", signInErr?.message);
    process.exit(1);
  }

  // Remove any existing TOTP factors so we start clean.
  const { data: existing } = await userClient.auth.mfa.listFactors();
  for (const f of existing?.totp ?? []) {
    await userClient.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data: enroll, error: enrollErr } =
    await userClient.auth.mfa.enroll({ factorType: "totp" });
  if (enrollErr || !enroll) {
    console.error("Enroll failed:", enrollErr?.message);
    process.exit(1);
  }

  const secret = enroll.totp.secret;
  const code = authenticator.generate(secret);
  const { data: challenge, error: chErr } =
    await userClient.auth.mfa.challenge({ factorId: enroll.id });
  if (chErr || !challenge) {
    console.error("Challenge failed:", chErr?.message);
    process.exit(1);
  }
  const { error: verifyErr } = await userClient.auth.mfa.verify({
    factorId: enroll.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) {
    console.error("Verify failed:", verifyErr?.message);
    process.exit(1);
  }

  // Quiet unused-var lint for admin (kept for future admin-only steps).
  void admin;

  console.log("\nSeeded TOTP factor for", email);
  console.log("E2E_TOTP_SECRET=" + secret);
  console.log("\nStore that value as a CI secret and in your local .env.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
