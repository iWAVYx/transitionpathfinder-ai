import { followOrigin, useNavigationOrigin } from "@/components/navigation/NavigationOriginProvider";
import { useContext } from "react";
import { DashboardReturnContext, isDashboardHomeDestination } from "./dashboard-return-context";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceNavigation } from "@/hooks/use-workspace-navigation";
import { cn } from "@/lib/utils";

type BackToDashboardProps = {
  /** Fallback for a direct visit with no observed source; otherwise resolves from roles. */
  to?: string;
  /** Override the visible label. Otherwise reflects the resolved workspace. */
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
 *   1. The actual observed source page, when known.
 *   2. `to` fallback, if provided.
 *   3. The same role and platform-owner home used by the site header.
 *   4. The guarded "/dashboard" entry if workspace lookup is unavailable.
 */
export function BackToDashboard({ to, label, className }: BackToDashboardProps) {
  const headerOwnsReturn = useContext(DashboardReturnContext);
  const origin = useNavigationOrigin();
  const { user, loading } = useAuth();
  if (headerOwnsReturn && (origin || !to || isDashboardHomeDestination(to))) return null;
  if (origin) return <Link to={origin.to as never} onClick={event => followOrigin(event, origin)} data-testid="back-to-dashboard"
    className={cn("inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background hover:text-foreground", className)}>
    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />{origin.label}
  </Link>;
  const viewerId = !loading && user ? user.id : null;
  return (
    <WorkspaceReturnLink
      key={JSON.stringify([viewerId, Boolean(loading), to ?? null])}
      viewerId={to ? null : viewerId}
      to={to}
      label={label}
      className={className}
    />
  );
}

function WorkspaceReturnLink({
  viewerId,
  to,
  label,
  className,
}: BackToDashboardProps & { viewerId: string | null }) {
  const { home } = useWorkspaceNavigation(viewerId);
  const destination = to ?? home.to;
  const homeLabel = to ? (to === "/owner" ? "Owner Hub" : "dashboard") : home.label;

  return (
    <Link
      to={destination as never}
      data-testid="back-to-dashboard"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label ?? `Back to ${homeLabel}`}
    </Link>
  );
}

export default BackToDashboard;
