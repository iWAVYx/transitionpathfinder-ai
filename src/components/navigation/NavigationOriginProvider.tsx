import { DashboardReturnContext } from "@/components/dashboard/dashboard-return-context";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode, type MouseEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { NavigationOrigins, navigationOriginLabel } from "@/lib/navigation-origin";

export type OriginReturn = { to: string; label: string; go: () => void };
const NavigationOriginContext = createContext<OriginReturn | null>(null);
export const useNavigationOrigin = () => useContext(NavigationOriginContext);

export function NavigationOriginProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  // Signing out or switching accounts discards all remembered private sources.
  const identity = loading ? "loading" : user?.id ?? "public";
  const tracker = useMemo(() => new NavigationOrigins(router.history.location), [router, identity]);
  const subscribe = useCallback((notify: () => void) => router.history.subscribe(({ location, action }) => {
    tracker.update(location, action.type);
    notify();
  }), [router, tracker]);
  const origin = useSyncExternalStore(subscribe, () => tracker.origin, () => null);
  const value = useMemo<OriginReturn | null>(() => origin ? {
    to: origin.href,
    label: `Back to ${navigationOriginLabel(origin.pathname)}`,
    go: () => {
      const delta = origin.index - router.history.location.state.__TSR_index;
      if (delta < 0) router.history.go(delta);
    },
  } : null, [origin, router]);
  return <NavigationOriginContext.Provider value={value}>{children}</NavigationOriginContext.Provider>;
}

/** Modified clicks retain normal link behavior, including opening a new tab. */
export function followOrigin(event: MouseEvent<HTMLAnchorElement>, origin: OriginReturn) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  origin.go();
}

/** Existing local returns defer to the shared header when a real source is known. */
export function ContextualBackLink({ to, label, className, search, testId }: {
  to: string; label: string; className?: string; search?: Record<string, string>; testId?: string;
}) {
  const origin = useNavigationOrigin();
  const headerOwnsReturn = useContext(DashboardReturnContext);
  if (origin && headerOwnsReturn) return null;
  return <Link to={(origin?.to ?? to) as never} search={origin ? undefined : search as never}
    onClick={origin ? event => followOrigin(event, origin) : undefined}
    data-testid={testId} className={className}>{origin?.label ?? label}</Link>;
}
