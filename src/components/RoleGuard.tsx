import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyRoles } from "@/lib/profile.functions";
import {
  ROUTE_AUDIENCES,
  audiencesForRoles,
  fallbackPathFor,
  labelForAudiences,
  labelForDestination,
  type RoleAudience,
} from "@/lib/role-policy";

type Props = {
  path: keyof typeof ROUTE_AUDIENCES | string;
  /** Override the policy table for ad-hoc gating. */
  allow?: RoleAudience[];
  /** Optional route-owned loading/denied shell, used when the page needs its own <main>. */
  fallback?: React.ReactNode;
  /**
   * When true, always render `children` immediately (even while the role
   * check is in-flight) so the outer shell — including the semantic
   * `<main>` — stays mounted across the checking → allowed transition.
   * Denied users are still redirected via `useEffect`; RLS still protects
   * data. Use for routes where an unmount/remount flicker would leave
   * Playwright / a11y probes without a landmark to find.
   */
  keepMounted?: boolean;
  children: React.ReactNode;
};

/**
 * Client-side role guard for workspace pages. Fetches the current user's
 * roles, redirects to an allowed section if they don't qualify, and shows
 * a friendly toast explaining why.
 */
export function RoleGuard({ path, allow, fallback, keepMounted, children }: Props) {
  const navigate = useNavigate();
  const fetchRoles = useServerFn(getMyRoles);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    fetchRoles()
      .then(({ roles }) => {
        if (cancelled) return;
        const required = allow ?? ROUTE_AUDIENCES[path];
        if (!required) {
          setStatus("allowed");
          return;
        }
        const have = audiencesForRoles(roles);
        const ok = required.some((r) => have.has(r));
        if (ok) {
          setStatus("allowed");
        } else {
          setStatus("denied");
          const target = fallbackPathFor(roles);
          toast.error(`That page is for ${labelForAudiences(required)}.`, {
            description: `Taking you to ${labelForDestination(target)} instead.`,
          });
          navigate({ to: target, replace: true });
        }
      })
      .catch(() => {
        // If we can't read roles, fail open to avoid locking users out on a
        // transient network error — the underlying RLS still protects data.
        if (!cancelled) setStatus("allowed");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, navigate, path, allow]);

  if (keepMounted) {
    // Always render children so the outer shell (and its <main>) stays
    // mounted across the role-check transition. Denied users are still
    // redirected by the effect above, and RLS protects any data reads.
    return <>{children}</>;
  }

  if (status === "checking" || status === "denied") {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }
  return <>{children}</>;
}
