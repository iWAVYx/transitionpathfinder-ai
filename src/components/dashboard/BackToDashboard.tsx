import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/profile.functions";
import { fallbackPathFor } from "@/lib/role-policy";
import { cn } from "@/lib/utils";

type BackToDashboardProps = {
  /** Override the destination. When omitted, resolves from the viewer's roles. */
  to?: string;
  /** Override the visible label. Defaults to "Back to dashboard". */
  label?: string;
  className?: string;
};

/**
 * Shared "Back to dashboard" affordance used on every role-scoped
 * dashboard sub-page (family/*, educator/*, school/*, district/*,
 * partners-manage/*, owner/*). Keeps the visual + destination logic
 * consistent so users always return to the right role home.
 *
 * Destination resolution:
 *   1. `to` prop, if provided.
 *   2. The viewer's role fallback path (fallbackPathFor).
 *   3. "/dashboard" while roles are loading, so the link is never dead.
 */
export function BackToDashboard({
  to,
  label = "Back to dashboard",
  className,
}: BackToDashboardProps) {
  const loadRoles = useServerFn(getMyRoles);
  const [resolved, setResolved] = useState<string>(to ?? "/dashboard");

  useEffect(() => {
    if (to) {
      setResolved(to);
      return;
    }
    let cancelled = false;
    loadRoles()
      .then((roles) => {
        if (cancelled) return;
        setResolved(fallbackPathFor(roles ?? []));
      })
      .catch(() => {
        /* keep the safe /dashboard default */
      });
    return () => {
      cancelled = true;
    };
  }, [to, loadRoles]);

  return (
    <Link
      to={resolved}
      data-testid="back-to-dashboard"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

export default BackToDashboard;
