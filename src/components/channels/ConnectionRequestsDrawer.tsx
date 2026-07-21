import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, X, Check, Ban, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  listMyConnectionRequests,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  type ConnectionRequest,
} from "@/lib/channel-connection-requests.functions";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConnectionRequestsDrawer({
  onOpenChannel,
  triggerLabel,
}: {
  onOpenChannel?: (channelId: string) => void;
  triggerLabel?: string;
}) {
  const listFn = useServerFn(listMyConnectionRequests);
  const respondFn = useServerFn(respondToConnectionRequest);
  const withdrawFn = useServerFn(withdrawConnectionRequest);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["channel-connection-requests"],
    queryFn: () => listFn(),
  });

  const requests = query.data?.requests ?? [];
  const pendingIncoming = requests.filter(
    (r) => r.direction === "incoming" && r.status === "pending",
  );
  const pendingOutgoing = requests.filter(
    (r) => r.direction === "outgoing" && r.status === "pending",
  );
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 10);
  const badge = pendingIncoming.length;

  const respondMutation = useMutation({
    mutationFn: (args: { request_id: string; decision: "accepted" | "declined" }) =>
      respondFn({ data: args }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["channel-connection-requests"] });
      qc.invalidateQueries({ queryKey: ["transition-channels"] });
      if (res.channel_id && onOpenChannel) onOpenChannel(res.channel_id);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (request_id: string) => withdrawFn({ data: { request_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channel-connection-requests"] }),
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open connection requests"
      >
        <Inbox className="h-4 w-4 mr-2" />
        {triggerLabel ?? "Requests"}
        {badge > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Connection requests">
          <button
            type="button"
            aria-label="Close connection requests"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-background shadow-xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Connection Requests</h2>
                <p className="text-xs text-muted-foreground">
                  Approve or decline to open a partner channel.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="p-4 space-y-6">
              {query.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No connection requests yet. When someone asks to open a partner channel with your
                  organization, it will show up here.
                </p>
              ) : (
                <>
                  <Section title="Awaiting your response" count={pendingIncoming.length}>
                    {pendingIncoming.map((r) => (
                      <RequestCard key={r.id} r={r}>
                        <Button
                          size="sm"
                          onClick={() =>
                            respondMutation.mutate({ request_id: r.id, decision: "accepted" })
                          }
                          disabled={respondMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            respondMutation.mutate({ request_id: r.id, decision: "declined" })
                          }
                          disabled={respondMutation.isPending}
                        >
                          <Ban className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </RequestCard>
                    ))}
                    {pendingIncoming.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nothing awaiting your response.</p>
                    )}
                  </Section>

                  <Section title="Your open requests" count={pendingOutgoing.length}>
                    {pendingOutgoing.map((r) => (
                      <RequestCard key={r.id} r={r}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => withdrawMutation.mutate(r.id)}
                          disabled={withdrawMutation.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-1" /> Withdraw
                        </Button>
                      </RequestCard>
                    ))}
                    {pendingOutgoing.length === 0 && (
                      <p className="text-sm text-muted-foreground">No outgoing requests.</p>
                    )}
                  </Section>

                  <Section title="Recently resolved" count={resolved.length}>
                    {resolved.map((r) => (
                      <RequestCard key={r.id} r={r}>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {r.status}
                        </span>
                        {r.resulting_channel_id && onOpenChannel && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              onOpenChannel(r.resulting_channel_id!);
                              setOpen(false);
                            }}
                          >
                            Open channel
                          </Button>
                        )}
                      </RequestCard>
                    ))}
                    {resolved.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nothing resolved yet.</p>
                    )}
                  </Section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title} {count > 0 && <span className="text-foreground">({count})</span>}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RequestCard({ r, children }: { r: ConnectionRequest; children: React.ReactNode }) {
  const who =
    r.direction === "incoming"
      ? `${r.requester_name ?? "A member"}${
          r.requester_organization_name ? ` (${r.requester_organization_name})` : ""
        }`
      : `To ${r.target_partner_organization_name ?? "partner org"}`;
  return (
    <article className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium truncate">{who}</p>
        <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(r.created_at)}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Purpose: {r.purpose_category}</p>
      <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{r.message}</p>
      {r.proposed_next_step && (
        <p className="mt-2 text-xs text-muted-foreground">
          Next step: <span className="text-foreground">{r.proposed_next_step}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{children}</div>
    </article>
  );
}
