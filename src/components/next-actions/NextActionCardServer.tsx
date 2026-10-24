import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NextActionCard } from "./NextActionCard";
import { getNextActionsForMe, completeNextAction } from "@/lib/next-actions/next-actions.functions";

import { readDashboardWidget } from "@/lib/dashboard/dashboard-widget-read";

import type { NextActionContext } from "@/lib/next-actions/action-context";

interface Props {
  context?: NextActionContext;
  historyRoute?: string;
  suggestionLabel?: string;
  suggestionRoute?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  defaultLimit?: number;
}

/**
 * Signed-in Next Actions card. Fetches the caller's active + recently
 * completed actions (stored rows merged with derived actions — draft
 * reports and upcoming meetings) and wires the Complete
 * button through the RLS-protected server function.
 */
export function NextActionCardServer({ context, ...props }: Props) {
  const { user, loading } = useAuth();
  const viewerId = user?.id;
  const currentViewer = useRef<string | null>(null);
  currentViewer.current = loading ? null : (viewerId ?? null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const qc = useQueryClient();
  const fetchActions = useServerFn(getNextActionsForMe);
  const complete = useServerFn(completeNextAction);
  const [completion, setCompletion] = useState<{ id: string; viewerId: string } | null>(null);
  const completingId = completion && completion.viewerId === viewerId ? completion.id : null;

  const q = useQuery({
    queryKey: ["next-actions", "me", viewerId, context?.role, context?.student_id],
    enabled: !!viewerId && !loading,
    queryFn: ({ signal }) => readDashboardWidget(signal, async (requestSignal) => {
      if (currentViewer.current !== viewerId) throw new Error("Your sign-in changed. Please try again.");
      const result = await fetchActions({ data: context ?? {}, signal: requestSignal });
      if (currentViewer.current !== viewerId) throw new Error("Your sign-in changed. Please try again.");
      if (result.viewer_id !== viewerId) throw new Error("Your sign-in changed. Please try again.");
      return result;
    }),
    retry: false,
    staleTime: 30_000,
  });

  const completeM = useMutation({
    mutationFn: (vars: { id: string; viewerId: string; expectedUpdatedAt?: string }) =>
      complete({
        data: {
          id: vars.id,
          expected_viewer_id: vars.viewerId,
          ...(vars.expectedUpdatedAt ? { expected_updated_at: vars.expectedUpdatedAt } : {}),
        },
      }),
    onMutate: (vars) => setCompletion({ id: vars.id, viewerId: vars.viewerId }),
    onSuccess: (result, vars) => {
      const current = mounted.current && currentViewer.current === vars.viewerId;
      qc.invalidateQueries({
        queryKey: ["next-actions", "me", vars.viewerId],
        ...(current ? {} : { refetchType: "none" as const }),
      });
      if (!current) return;
      if (result.activityLogged === false)
        toast.warning("Marked complete. Activity history could not be updated.");
      else toast.success("Marked complete");
    },
    onError: (e: Error, vars) => {
      const current = mounted.current && currentViewer.current === vars.viewerId;
      qc.invalidateQueries({
        queryKey: ["next-actions", "me", vars.viewerId],
        ...(current ? {} : { refetchType: "none" as const }),
      });
      if (current) toast.error(e.message || "Could not complete");
    },
    onSettled: (_result, _error, vars) => {
      if (mounted.current)
        setCompletion((value) =>
          value?.id === vars.id && value.viewerId === vars.viewerId ? null : value,
        );
    },
  });

  if (loading || !viewerId || q.isPending) return <p role="status">Loading Your Next Actions…</p>;
  if (q.isError)
    return (
      <div role="alert" className="mt-6 rounded-2xl border border-border p-5">
        <p>Your next actions could not be fully loaded.</p>
        <button type="button" onClick={() => void q.refetch()} className="mt-2 underline">
          Try Again
        </button>
      </div>
    );

  return (
    <NextActionCard
      actions={q.data?.active ?? []}
      recentlyCompleted={q.data?.recentlyCompleted ?? []}
      onComplete={(id) => {
        // Derived actions (id starts with "derived:") are not persisted rows —
        // they disappear naturally once their underlying state changes, so
        // skip the server call.
        if (id.startsWith("derived:")) {
          toast.info("Open the linked item to resolve this suggestion.");
          return;
        }
        completeM.mutate({
          id,
          viewerId,
          expectedUpdatedAt: q.data?.active.find((action) => action.id === id)?.updatedAt,
        });
      }}
      completingId={completingId}
      {...props}
    />
  );
}
