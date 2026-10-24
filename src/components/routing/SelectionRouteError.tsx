import {
  SearchParamError,
  useNavigate,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RouteErrorComponent } from "@/components/routing/RouteErrorComponent";
import type { ComponentType } from "react";

type SelectionErrorOptions = {
  path: string;
  invalidKeys: (search: Record<string, unknown>) => string[];
  description: string;
  testId: string;
  fallback?: ComponentType<ErrorComponentProps>;
};
export function selectionRouteErrorComponent(options: SelectionErrorOptions) {
  return function SelectionRouteError(props: ErrorComponentProps) {
    return <SelectionLinkRecovery {...props} options={options} />;
  };
}
function SelectionLinkRecovery({
  error,
  reset,
  options,
}: ErrorComponentProps & { options: SelectionErrorOptions }) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const currentLocation = useRef(location);
  currentLocation.current = location;
  const alive = useRef(false);
  const busy = useRef(false);
  const [recovering, setRecovering] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const { path } = options;
  const search = location.search as Record<string, unknown>;
  const invalidKeys = options.invalidKeys(search);
  if (location.pathname !== path) return null;
  // Unexpected loader/render/auth errors retain the ordinary retry boundary.
  const Fallback = options.fallback ?? RouteErrorComponent;
  if (!(error instanceof SearchParamError) || !invalidKeys.length)
    return <Fallback error={error} reset={reset} />;
  const recover = async () => {
    if (!alive.current || busy.current || currentLocation.current.pathname !== path) return;
    busy.current = true;
    setRecovering(true);
    setFailed(false);
    const current = currentLocation.current;
    const raw = current.search as Record<string, unknown>;
    const clear = Object.fromEntries(options.invalidKeys(raw).map((key) => [key, undefined]));
    try {
      await navigate({
        to: path,
        search: (previous) => ({ ...raw, ...previous, ...clear }),
        hash: current.hash,
        replace: true,
        resetScroll: false,
      });
    } catch {
      if (alive.current && currentLocation.current.pathname === path) setFailed(true);
    } finally {
      if (alive.current) {
        busy.current = false;
        setRecovering(false);
      }
    }
  };
  return (
    <main className="mx-auto max-w-xl px-4 py-10" data-testid={options.testId}>
      <h1 className="text-xl font-semibold">This Saved Link Needs Updating</h1>
      <p className="mt-3 text-sm text-foreground/75">{options.description}</p>
      {failed && (
        <p role="alert" className="mt-3 text-sm">
          The link could not be updated. Please try again.
        </p>
      )}
      <Button
        className="mt-4"
        variant="outline"
        disabled={recovering}
        onClick={() => void recover()}
      >
        {recovering ? "Updating Link…" : "Clear Invalid Selections"}
      </Button>
    </main>
  );
}
