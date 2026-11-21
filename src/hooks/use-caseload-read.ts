import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanningLifetime } from "./use-planning-lifetime";
/** Shared account-bound reads: errors are not empty success, older replies cannot replace a refresh. */
export function useCaseloadRead<T>(load: (args: any) => Promise<T>, empty: T) {
  const scope = usePlanningLifetime(),
    initial = useRef(empty);
  const [state, setState] = useState<{
    viewer?: string;
    data: T;
    loading: boolean;
    error: boolean;
  }>({ data: initial.current, loading: true, error: false });
  const reload = useCallback(async () => {
    if (!scope.available || !scope.current()) return;
    const sequence = scope.nextRead();
    setState({ viewer: scope.viewerId, data: initial.current, loading: true, error: false });
    try {
      const data = await load({ data: { expected_viewer_id: scope.viewerId } });
      if (scope.currentRead(sequence))
        setState({ viewer: scope.viewerId, data, loading: false, error: false });
    } catch {
      if (scope.currentRead(sequence))
        setState({ viewer: scope.viewerId, data: initial.current, loading: false, error: true });
    }
  }, [load, scope.viewerId, scope.available]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const current = scope.available && state.viewer === scope.viewerId;
  return {
    data: current ? state.data : initial.current,
    loading: !current || state.loading,
    error: current && state.error,
    reload,
    viewerId: scope.viewerId,
  };
}
