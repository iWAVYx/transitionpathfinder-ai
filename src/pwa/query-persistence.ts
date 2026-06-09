// Persist the TanStack Query cache to localStorage so previously-loaded
// data remains available when the user is offline. Runs only in the
// browser; SSR is a no-op.

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import type { QueryClient } from "@tanstack/react-query";

const CACHE_KEY = "tf-query-cache-v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function setupQueryPersistence(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;
  if (typeof window.localStorage === "undefined") return;

  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: CACHE_KEY,
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE_MS,
      buster: "v1",
      dehydrateOptions: {
        // Don't persist queries that errored or hold auth-bearing payloads
        // we'd rather refetch fresh.
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" &&
          !query.queryKey.some(
            (k) => typeof k === "string" && (k === "session" || k.startsWith("auth")),
          ),
      },
    });
  } catch {
    // localStorage can throw in private mode — ignore.
  }
}
