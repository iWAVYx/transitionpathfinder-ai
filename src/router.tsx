import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setupQueryPersistence } from "./pwa/query-persistence";
import { RouteErrorComponent } from "./components/routing/RouteErrorComponent";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep cached data usable while offline so persisted entries can
        // hydrate on next launch instead of being garbage-collected.
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        staleTime: 1000 * 30,
      },
    },
  });

  setupQueryPersistence(queryClient);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Knowledge: router config MUST set defaultErrorComponent so every
    // loader without an explicit errorComponent still lands on a
    // recoverable UI (Try Again + Return Home).
    defaultErrorComponent: RouteErrorComponent,
  });

  return router;
};

