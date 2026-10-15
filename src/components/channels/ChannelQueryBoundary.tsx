import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

const ChannelWorkspace = createContext<{ viewerId: string; isCurrent: () => boolean } | null>(null);

/** Mount with the settled viewer's key. Conversation caches never hydrate from
 * another workspace or the app's persisted general-purpose query client. */
export function ChannelQueryBoundary({
  children,
  viewerId,
  scopeKey,
  currentScope,
}: {
  children: ReactNode;
  viewerId: string;
  scopeKey: string;
  currentScope: { current: string };
}) {
  const parent = useQueryClient();
  const [client] = useState(() => new QueryClient({ defaultOptions: parent.getDefaultOptions() }));
  const active = useRef(true);
  const isCurrent = useCallback(
    () => active.current && currentScope.current === scopeKey,
    [currentScope, scopeKey],
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      void client.cancelQueries();
      client.clear();
    };
  }, [client]);
  return (
    <ChannelWorkspace.Provider value={{ viewerId, isCurrent }}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ChannelWorkspace.Provider>
  );
}

/** A token changes on each selection transition, including A-to-B-to-A. */
export function useChannelViewScope(selection: string) {
  const workspace = useContext(ChannelWorkspace);
  if (!workspace) throw new Error("Channel workspace is unavailable.");
  const active = useRef(true);
  const latest = useRef({ selection });
  if (latest.current.selection !== selection) latest.current = { selection };
  const token = latest.current;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const isWorkspaceCurrent = useCallback(
    () => active.current && workspace.isCurrent(),
    [workspace.isCurrent],
  );
  const isCurrent = useCallback(
    () => isWorkspaceCurrent() && latest.current === token,
    [isWorkspaceCurrent, token],
  );
  return { viewerId: workspace.viewerId, isCurrent, isWorkspaceCurrent };
}
