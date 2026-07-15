/**
 * Feature-aware "sign in required" messages surfaced on the login page
 * when a signed-out user is bounced from a protected route.
 *
 * The redirect layer (`_authenticated` beforeLoad + client fallback,
 * plus token-invite routes) passes the intended pathname; this maps it
 * to a short user-facing reason. Anything unrecognized falls back to a
 * generic message. Kept in a shared module so login.index.tsx and any
 * future guard can stay in sync.
 */

export const AUTH_REASON_PARAM = "reason";

type ReasonRule = { test: (path: string) => boolean; message: string };

const RULES: ReasonRule[] = [
  { test: (p) => p.startsWith("/pathway") || p.includes("/report"), message: "Please sign in to view the Pathway Report." },
  { test: (p) => p.includes("/documents") || p.startsWith("/hubs/documents"), message: "Please sign in to upload or view documents." },
  { test: (p) => p.includes("/calendar") || p.startsWith("/hubs/calendar"), message: "Please sign in to access your Calendar." },
  { test: (p) => p.startsWith("/opportunities") || p.startsWith("/partners-manage"), message: "Please sign in to manage opportunities." },
  { test: (p) => p.startsWith("/meeting") || p.startsWith("/hubs/meeting"), message: "Please sign in to prepare or review meetings." },
  { test: (p) => p.startsWith("/intake"), message: "Please sign in to continue the intake." },
  { test: (p) => p.startsWith("/caseload") || p.startsWith("/hubs/caseload"), message: "Please sign in to view your caseload." },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/owner"), message: "Please sign in to access administrator tools." },
  { test: (p) => p.startsWith("/school") || p.startsWith("/district"), message: "Please sign in to access role-specific tools." },
  { test: (p) => p.startsWith("/dashboard") || p.startsWith("/hubs/"), message: "Please sign in to view your dashboard." },
  { test: (p) => p.startsWith("/settings") || p.startsWith("/onboarding"), message: "Please sign in to continue." },
];

export function reasonForPath(pathname: string | undefined | null): string {
  if (!pathname) return "generic";
  for (let i = 0; i < RULES.length; i++) {
    if (RULES[i].test(pathname)) return String(i);
  }
  return "generic";
}

export function messageForReason(reason: string | undefined | null): string {
  if (!reason) return "";
  if (reason === "generic") return "Please sign in to use this feature.";
  const idx = Number(reason);
  if (Number.isFinite(idx) && idx >= 0 && idx < RULES.length) return RULES[idx].message;
  return "Please sign in to use this feature.";
}

export const SIGN_IN_REQUIRED_TITLE = "Sign In Required";
