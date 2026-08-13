// Persist the TanStack Query cache to localStorage so previously-loaded
// data remains available when the user is offline. Runs only in the
// browser; SSR is a no-op.

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";


const CACHE_KEY = "tf-query-cache-v2";
const LEGACY_CACHE_KEYS = ["tf-query-cache-v1"] as const;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Loose typing: workspace pulls in two query-core copies, so the imported
// QueryClient type is not interchangeable. The shape is identical at runtime.
export function setupQueryPersistence(queryClient: unknown): void {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage === "undefined") return;

  try {
    // v1 persisted every successful query unless its key looked auth-related.
    // That allowed user-scoped dashboard data to cross a sign-out/sign-in
    // boundary and could race React hydration when a storage state was
    // restored in a new browser context. Remove it before attempting restore.
    for (const key of LEGACY_CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }

    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: CACHE_KEY,
      throttleTime: 1000,
    });

    persistQueryClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient: queryClient as any,
      persister,
      maxAge: MAX_AGE_MS,
      buster: "v1",
      dehydrateOptions: {
        // Private by default: a query must explicitly opt in with
        // `meta: { persist: true }`. Authenticated/dashboard queries never
        // persist merely because their key happens not to mention "auth".
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" && query.meta?.persist === true,
      },
    });
  } catch {
    // localStorage can throw in private mode — ignore.
  }
}
