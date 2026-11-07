import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  listMyConnectionRequests,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  type ConnectionRequest,
} from "@/lib/channel-connection-requests.functions";
import { useChannelViewScope } from "./ChannelQueryBoundary";
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const requestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "accepted", "declined", "withdrawn", "expired"]),
  message: z.string(),
  purpose_category: z.string(),
  proposed_next_step: z.string().nullable(),
  created_at: date,
  expires_at: date,
  requester_id: z.string().uuid(),
  requester_name: z.string().nullable(),
  requester_organization_id: z.string().uuid().nullable(),
  requester_organization_name: z.string().nullable(),
  target_partner_organization_id: z.string().uuid(),
  target_partner_organization_name: z.string().nullable(),
  resulting_channel_id: z.string().uuid().nullable(),
  direction: z.enum(["incoming", "outgoing"]),
  can_respond: z.boolean(),
  can_withdraw: z.boolean(),
  channel_ready: z.boolean(),
});
const resultSchema = z.object({
  ok: z.literal(true),
  request_id: z.string().uuid(),
  status: z.enum(["accepted", "declined", "withdrawn"]),
  channel_id: z.string().uuid().nullable(),
  channel_ready: z.boolean(),
});
export type OpenConnectionChannel = (channelId: string) => void | Promise<void>;
export function ChannelConnectionRequests({
  onOpenChannel,
}: {
  onOpenChannel?: OpenConnectionChannel;
}) {
  const [resolvedLimit, setResolvedLimit] = useState(10);
  const scope = useChannelViewScope("connection-requests"),
    load = useServerFn(listMyConnectionRequests);
  const latest = useRef(0);
  const query = useQuery({
    queryKey: ["channel-connection-requests"],
    queryFn: async () => {
      if (!scope.isCurrent()) throw new Error("Sign-in changed.");
      const token = ++latest.current;
      const response = await load({ data: { expected_viewer_id: scope.viewerId } });
      if (!scope.isCurrent() || token !== latest.current) throw new Error("Requests changed.");
      const requests = z.array(requestSchema).parse(response.requests);
      if (
        new Set(requests.map((r) => r.id)).size !== requests.length ||
        requests.some(
          (r) =>
            (r.requester_id === scope.viewerId) !== (r.direction === "outgoing") ||
            (r.can_respond && (r.direction !== "incoming" || r.status !== "pending")) ||
            (r.can_withdraw && (r.direction !== "outgoing" || r.status !== "pending")) ||
            (r.channel_ready && (!r.resulting_channel_id || r.status !== "accepted")),
        )
      )
        throw new Error("Request response mismatch.");
      return { requests };
    },
    retry: false,
  });
  const requests = query.isSuccess ? query.data.requests : [];
  const active = (r: ConnectionRequest) =>
    r.status === "pending" && Date.parse(r.expires_at) > Date.now();
  const incoming = requests.filter((r) => active(r) && r.direction === "incoming"),
    outgoing = requests.filter((r) => active(r) && r.direction === "outgoing"),
    resolved = requests.filter((r) => !active(r));
  return (
    <section className="space-y-4" aria-label="Connection Requests">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            if (scope.isCurrent()) void query.refetch();
          }}
        >
          Refresh Requests
        </Button>
      </div>
      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>We couldn't load your connection requests.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Reload Requests
          </Button>
        </div>
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No connection requests yet.</p>
      ) : (
        <>
          {[
            ["Awaiting Your Response", incoming],
            ["Your Open Requests", outgoing],
            ["Recently Resolved", resolved.slice(0, resolvedLimit)],
          ].map(([title, rows]) => (
            <section key={title as string} className="space-y-2">
              <h3 className="text-sm font-semibold">
                {title as string} ({(rows as ConnectionRequest[]).length})
              </h3>
              {(rows as ConnectionRequest[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in this category.</p>
              ) : (
                (rows as ConnectionRequest[]).map((r) => (
                  <ConnectionRow
                    key={`${r.id}:${r.requester_id}:${r.target_partner_organization_id}`}
                    request={r}
                    onOpenChannel={onOpenChannel}
                  />
                ))
              )}
            </section>
          ))}
          {resolved.length > resolvedLimit && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Showing {resolvedLimit} of {resolved.length} resolved or expired requests.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResolvedLimit((limit) => limit + 10)}
              >
                Show More Resolved Requests
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function ConnectionRow({
  request: r,
  onOpenChannel,
}: {
  request: ConnectionRequest;
  onOpenChannel?: OpenConnectionChannel;
}) {
  const scope = useChannelViewScope(
    JSON.stringify([
      r.id,
      r.status,
      r.requester_id,
      r.requester_organization_id,
      r.target_partner_organization_id,
      r.expires_at,
      r.resulting_channel_id,
      r.can_respond,
      r.can_withdraw,
      r.channel_ready,
      r.message,
      r.purpose_category,
      r.proposed_next_step,
    ]),
  );
  const respond = useServerFn(respondToConnectionRequest),
    withdraw = useServerFn(withdrawConnectionRequest),
    qc = useQueryClient();
  const pending = useRef(false),
    committed = useRef(false),
    opening = useRef(false);
  const [saved, setSaved] = useState<z.infer<typeof resultSchema> | null>(null),
    [error, setError] = useState<string | null>(null),
    [isOpening, setOpening] = useState(false);
  useEffect(() => {
    committed.current = false;
    setSaved(null);
    setError(null);
  }, [
    r.status,
    r.requester_organization_id,
    r.expires_at,
    r.resulting_channel_id,
    r.can_respond,
    r.can_withdraw,
    r.channel_ready,
    r.message,
    r.purpose_category,
    r.proposed_next_step,
  ]);
  const invalidate = () => {
    if (!scope.isCurrent()) return;
    for (const key of [
      "channel-connection-requests",
      "transition-channels",
      "channel-tile-summary",
    ])
      void qc.invalidateQueries({ queryKey: [key] });
  };
  type Decision = "accepted" | "declined" | "withdrawn";
  type Request = {
    decision: Decision;
    currentView: () => boolean;
    data: {
      request_id: string;
      expected_viewer_id: string;
      expected_requester_id: string;
      expected_requester_organization_id: string | null;
      expected_target_organization_id: string;
      expected_expires_at: string;
      expected_message: string;
      expected_purpose_category: string;
      expected_proposed_next_step: string | null;
    };
  };
  const mutation = useMutation({
    mutationFn: async (captured: Request) => {
      if (!captured.currentView()) throw new Error("Request changed.");
      const result = resultSchema.parse(
        await (captured.decision === "withdrawn"
          ? withdraw({ data: captured.data })
          : respond({ data: { ...captured.data, decision: captured.decision } })),
      );
      if (
        result.request_id !== captured.data.request_id ||
        result.status !== captured.decision ||
        (result.channel_ready && (result.status !== "accepted" || !result.channel_id)) ||
        (result.status !== "accepted" && (result.channel_id !== null || result.channel_ready))
      )
        throw new Error("Decision response mismatch.");
      return result;
    },
    onSuccess: (result, captured) => {
      if (!captured.currentView()) return;
      committed.current = true;
      setSaved(result);
      invalidate();
    },
    onError: (_error, captured) => {
      if (captured.currentView())
        setError("We couldn't confirm this decision. Reload requests before trying again.");
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const decide = (decision: Decision) => {
    if (pending.current || committed.current || !scope.isCurrent() || r.status !== "pending")
      return;
    if (Date.parse(r.expires_at) <= Date.now()) {
      setError("This request has expired. Reload requests.");
      return;
    }
    if (decision === "withdrawn" ? !r.can_withdraw : !r.can_respond) return;
    pending.current = true;
    setError(null);
    mutation.mutate({
      decision,
      currentView: scope.isCurrent,
      data: {
        request_id: r.id,
        expected_viewer_id: scope.viewerId,
        expected_requester_id: r.requester_id,
        expected_requester_organization_id: r.requester_organization_id,
        expected_target_organization_id: r.target_partner_organization_id,
        expected_expires_at: r.expires_at,
        expected_message: r.message,
        expected_purpose_category: r.purpose_category,
        expected_proposed_next_step: r.proposed_next_step,
      },
    });
  };
  const effective =
    saved?.status ??
    (r.status === "pending" && Date.parse(r.expires_at) <= Date.now() ? "expired" : r.status);
  const channelId = saved?.channel_id ?? r.resulting_channel_id,
    ready = saved ? saved.channel_ready : r.channel_ready;
  const openChannel = async () => {
    if (!onOpenChannel || !channelId || !ready || opening.current || !scope.isCurrent()) return;
    opening.current = true;
    setOpening(true);
    setError(null);
    const current = scope.isCurrent;
    try {
      await onOpenChannel(channelId);
    } catch {
      if (current())
        setError(
          "The connection is confirmed, but the channel couldn't open. Try Open Channel again.",
        );
    } finally {
      opening.current = false;
      if (scope.isWorkspaceCurrent()) setOpening(false);
    }
  };
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {r.direction === "incoming"
            ? (r.requester_name ?? "A member")
            : `To ${r.target_partner_organization_name ?? "partner organization"}`}
        </p>
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Purpose: {r.purpose_category}</p>
      <p className="text-sm whitespace-pre-wrap">{r.message}</p>
      {r.proposed_next_step && (
        <p className="text-xs text-muted-foreground">Next step: {r.proposed_next_step}</p>
      )}
      {effective === "pending" && !saved ? (
        <div className="flex flex-wrap justify-end gap-2">
          {r.can_respond ? (
            <>
              <Button size="sm" disabled={mutation.isPending} onClick={() => decide("accepted")}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => decide("declined")}
              >
                Decline
              </Button>
            </>
          ) : r.can_withdraw ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => decide("withdrawn")}
            >
              Withdraw
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              A response isn't available from this account.
            </p>
          )}
        </div>
      ) : (
        <p role="status" className="text-sm capitalize">
          {effective}
        </p>
      )}
      {effective === "accepted" && !ready && (
        <p className="text-sm">
          The connection is accepted, but channel setup or access needs review. Refresh requests; do
          not accept it again.
        </p>
      )}
      {effective === "accepted" && ready && onOpenChannel && (
        <Button size="sm" variant="outline" disabled={isOpening} onClick={() => void openChannel()}>
          Open Channel
        </Button>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-sm">
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={invalidate}>
            Reload Requests
          </Button>
        </div>
      )}
    </article>
  );
}
