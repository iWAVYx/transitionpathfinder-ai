import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

/** Mount with the settled viewer's key. Conversation caches never hydrate from
 * another workspace or the app's persisted general-purpose query client. */
export function ChannelQueryBoundary({ children }: { children: ReactNode }) {
  const parent = useQueryClient();
  const [client] = useState(() => new QueryClient({ defaultOptions: parent.getDefaultOptions() }));
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
