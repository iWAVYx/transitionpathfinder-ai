import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NextActionCard } from "./NextActionCard";
import { getNextActionsForMe, completeNextAction } from "@/lib/next-actions/next-actions.functions";

interface Props {
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
 * reports, upcoming meetings, evidence gaps) and wires the Complete
 * button through the RLS-protected server function.
 */
export function NextActionCardServer(props: Props) {
  const { user, loading } = useAuth();
  const viewerId = user?.id;
  const qc = useQueryClient();
  const fetchActions = useServerFn(getNextActionsForMe);
  const complete = useServerFn(completeNextAction);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["next-actions", "me", viewerId],
    enabled: !!viewerId && !loading,
    queryFn: async () => {
      const result = await fetchActions();
      if (result.viewer_id !== viewerId) throw new Error("Your sign-in changed. Please try again.");
      return result;
    },
    staleTime: 30_000,
  });

  const completeM = useMutation({
    mutationFn: complete,
    onMutate: (vars) => setCompletingId(vars.data.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-actions", "me"] });
      toast.success("Marked complete");
    },
    onError: (e: Error) => toast.error(e.message || "Could not complete"),
    onSettled: () => setCompletingId(null),
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
        completeM.mutate({ data: { id } });
      }}
      completingId={completingId}
      {...props}
    />
  );
}
