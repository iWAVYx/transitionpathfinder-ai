/**
 * Trusted base URL for server-to-server fetches and links embedded in
 * outbound emails.
 *
 * Why this exists: previously we derived the origin from
 * `new URL(getRequest().url).origin`, which trusts the inbound `Host`
 * header. A spoofed Host (possible whenever the app is reachable without a
 * sanitizing reverse proxy, or during local/dev testing) would cause the
 * server to forward the caller's `Authorization: Bearer …` to an attacker
 * endpoint via the internal `/lovable/email/transactional/send` fetch, and
 * would also produce attacker-controlled accept-invite links inside the
 * email body.
 *
 * Resolution order:
 *   1. `APP_BASE_URL` env (set per environment in deployment config)
 *   2. The hard-coded production URL for this project
 *
 * Never reads any request header.
 */
const FALLBACK_BASE_URL = "https://transitionpathfinder-ai.lovable.app";

export function getAppBaseUrl(): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  return FALLBACK_BASE_URL;
}
