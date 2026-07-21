import { Link, useRouter } from "@tanstack/react-router";

/**
 * Shared error boundary for route-level `errorComponent` slots.
 *
 * Route-level errorComponents are required by knowledge for every route that
 * defines a loader; using this shared component keeps the recovery UX
 * consistent (invalidate + reset + return-home affordance) and avoids
 * bespoke boundaries that might swallow the retry contract.
 */
export function RouteErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Surface the error in the browser console for debugging; the friendly
  // UI is what the end user sees.
  if (typeof console !== "undefined") console.error(error);
  const router = useRouter();
  return (
    <main
      className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-12"
      data-testid="route-error-boundary"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading this page. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-label="Try loading this page again"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
