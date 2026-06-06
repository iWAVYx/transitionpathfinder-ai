import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Archive,
  LinkIcon,
  Link2Off,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ownerListReviewQueue,
  ownerReviewResource,
  type ReviewQueueItem,
  type ReviewDecision,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/resource-review")({
  head: () => ({ meta: [{ title: "Review Queue — Admin Hub" }] }),
  component: ReviewQueuePage,
});

const DECISIONS: {
  id: ReviewDecision;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  tone: "primary" | "secondary" | "destructive" | "outline";
  showFor: Array<"needs_review" | "broken_link">;
}[] = [
  {
    id: "approve",
    label: "Approve",
    description: "Mark as approved and ready for publishing.",
    icon: CheckCircle2,
    tone: "secondary",
    showFor: ["needs_review"],
  },
  {
    id: "publish",
    label: "Approve & Publish",
    description: "Approve and make it publicly visible immediately.",
    icon: Send,
    tone: "primary",
    showFor: ["needs_review"],
  },
  {
    id: "request_changes",
    label: "Request Changes",
    description: "Send back for revisions. Notes are saved to the history.",
    icon: MessageSquare,
    tone: "outline",
    showFor: ["needs_review", "broken_link"],
  },
  {
    id: "resolve_link",
    label: "Mark Link Fixed",
    description: "The link works now — remove broken status.",
    icon: LinkIcon,
    tone: "secondary",
    showFor: ["broken_link"],
  },
  {
    id: "mark_broken",
    label: "Confirm Broken",
    description: "Re-confirm the link is broken (keeps it in the queue).",
    icon: Link2Off,
    tone: "outline",
    showFor: ["needs_review", "broken_link"],
  },
  {
    id: "archive",
    label: "Archive",
    description: "Remove from active library. Keeps the record for history.",
    icon: Archive,
    tone: "destructive",
    showFor: ["needs_review", "broken_link"],
  },
];

function ReviewQueuePage() {
  const list = useServerFn(ownerListReviewQueue);
  const review = useServerFn(ownerReviewResource);

  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function reload(preserveIndex = false) {
    setLoading(true);
    try {
      const r = await list();
      setItems(r.items);
      if (!preserveIndex) setIndex(0);
      else setIndex((i) => Math.min(i, Math.max(0, r.items.length - 1)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = items[index];
  const counts = useMemo(
    () => ({
      total: items.length,
      needs: items.filter((i) => i.review_reason === "needs_review").length,
      broken: items.filter((i) => i.review_reason === "broken_link").length,
    }),
    [items],
  );

  const visibleDecisions = useMemo(
    () => (current ? DECISIONS.filter((d) => d.showFor.includes(current.review_reason)) : []),
    [current],
  );

  async function handleDecision(decision: ReviewDecision) {
    if (!current) return;
    if (decision === "request_changes" && notes.trim().length < 3) {
      toast.error("Add resolution notes explaining the requested changes.");
      return;
    }
    setSubmitting(true);
    try {
      await review({
        data: { id: current.id, decision, resolution_notes: notes.trim() || null },
      });
      toast.success(`Saved: ${decision.replace("_", " ")}`);
      // Remove from local queue and advance
      setItems((prev) => prev.filter((p) => p.id !== current.id));
      setNotes("");
      setIndex((i) => Math.min(i, Math.max(0, items.length - 2)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function nav(delta: number) {
    setNotes("");
    setIndex((i) => {
      const next = i + delta;
      if (next < 0) return 0;
      if (next >= items.length) return items.length - 1;
      return next;
    });
  }

  return (
    <OwnerShell
      title="Review Queue"
      description="Step through resources that need review or have broken links. Approve, request changes, or resolve link issues."
      actions={
        <Button variant="outline" size="sm" onClick={() => reload(true)}>
          Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading queue…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-medium">All caught up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No resources are waiting for review and no broken links are flagged.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/owner/resources">Open Resource Library</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/owner">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Queue stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="In queue" value={counts.total} />
            <StatCard label="Needs review" value={counts.needs} tone="warning" />
            <StatCard label="Broken links" value={counts.broken} tone="danger" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              Reviewing <span className="font-medium text-foreground">{index + 1}</span> of {items.length}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => nav(-1)} disabled={index === 0}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => nav(1)}
                disabled={index >= items.length - 1}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {current && (
            <article className="rounded-lg border border-border bg-background p-5">
              <div className="flex flex-wrap items-center gap-2">
                {current.review_reason === "broken_link" ? (
                  <Badge variant="destructive" className="gap-1">
                    <Link2Off className="h-3 w-3" /> Broken link
                  </Badge>
                ) : (
                  <Badge className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Needs review
                  </Badge>
                )}
                <Badge variant="outline">{current.published_status}</Badge>
                <Badge variant="outline">{current.resource_type}</Badge>
                {current.audience && <Badge variant="outline">{current.audience}</Badge>}
                {current.source_name && (
                  <span className="text-xs text-muted-foreground">Source: {current.source_name}</span>
                )}
              </div>

              <h2 className="mt-4 font-display text-xl font-medium leading-tight">
                {current.title}
              </h2>
              {current.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              )}

              {current.url && (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Open resource link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {current.review_notes && (
                <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Review history
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-foreground/80">
                    {current.review_notes}
                  </pre>
                </div>
              )}

              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resolution notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Explain what you changed, why you're approving, or what the contributor needs to fix. Saved to the resource's review history."
                  maxLength={4000}
                  className="mt-1"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Required when requesting changes. Optional for other actions.
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {visibleDecisions.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision(d.id)}
                      className={
                        "flex items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-50 " +
                        (d.tone === "primary"
                          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                          : d.tone === "destructive"
                            ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                            : "border-border bg-background hover:bg-muted")
                      }
                    >
                      <Icon
                        className={
                          "mt-0.5 h-4 w-4 shrink-0 " +
                          (d.tone === "primary"
                            ? "text-primary"
                            : d.tone === "destructive"
                              ? "text-destructive"
                              : "text-foreground/70")
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <Link
                  to="/owner/resources"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Edit full resource details →
                </Link>
                {submitting && (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                )}
              </div>
            </article>
          )}
        </div>
      )}
    </OwnerShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 text-2xl font-semibold " +
          (tone === "danger" && value > 0
            ? "text-destructive"
            : tone === "warning" && value > 0
              ? "text-amber-600 dark:text-amber-400"
              : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
