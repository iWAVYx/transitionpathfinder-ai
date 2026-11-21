import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./use-auth";
/** Context tokens change on account/student departure, including A→B→A. */
export function usePlanningLifetime(studentId?: string) {
  const { user, loading } = useAuth();
  const scope = useMemo(
    () => ({ viewerId: user?.id, active: false, busy: false, blocked: false, read: 0 }),
    [user?.id, studentId, loading],
  );
  const [, render] = useState(0);
  useEffect(() => {
    scope.active = !loading && !!scope.viewerId;
    return () => {
      scope.active = false;
    };
  }, [scope, loading]);
  return {
    viewerId: scope.viewerId,
    available: !loading && !!scope.viewerId,
    current: () => scope.active,
    begin: () => {
      if (!scope.active || scope.busy || scope.blocked) return false;
      scope.busy = true;
      return true;
    },
    finish: () => {
      scope.busy = false;
    },
    uncertain: scope.blocked,
    markUncertain: () => {
      if (scope.active) {
        scope.blocked = true;
        render((value) => value + 1);
      }
    },
    confirmRead: () => {
      if (scope.active) {
        scope.blocked = false;
        render((value) => value + 1);
      }
    },
    nextRead: () => ++scope.read,
    currentRead: (read: number) => scope.active && scope.read === read,
  };
}
