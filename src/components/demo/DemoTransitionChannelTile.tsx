import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight, Eye } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { useDemoChannelSummary } from "@/lib/demo/use-demo-channels";
import type { DemoRoleId } from "@/lib/demo/role-previews";

/**
 * Dashboard tile that mirrors the signed-in Transition Channel tile and
 * matches the shared feature-tile format used by PartnerNetworkTile:
 * icon + title + status pill, summary, two-column bullets, and a footer
 * with a Preview button and an Open Channel CTA. Both actions link to
 * `/demo/transition-channel` with the role + context id preserved.
 */
export function DemoTransitionChannelTile({
  role,
  contextId,
}: {
  role: DemoRoleId;
  contextId: string;
}) {
  const summary = useDemoChannelSummary(role, contextId);
  const search: Record<string, string> = { role, ctx: contextId };
  if (role === "student" || role === "family" || role === "educator") {
    search.student = contextId;
  }

  const status =
    summary.unread > 0
      ? `${summary.unread} new`
      : `${summary.channelCount} channel${summary.channelCount === 1 ? "" : "s"}`;
  const tone: "default" | "success" | "muted" =
    summary.unread > 0 ? "success" : summary.channelCount === 0 ? "muted" : "default";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span
        className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
            Transition Channel
          </h3>
        </div>
        <Pill tone={tone}>{status}</Pill>
      </div>

      <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">
        Communicate, coordinate next steps, and keep important transition
        conversations connected.
      </p>

      <dl className="mx-3.5 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
        <div className="flex min-w-0 flex-col">
          <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Active Channels
          </dt>
          <dd className="truncate text-[13px] font-semibold text-foreground">
            {summary.channelCount}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Pending Requests
          </dt>
          <dd className="truncate text-[13px] font-semibold text-foreground">
            {summary.pendingRequests}
          </dd>
        </div>
      </dl>

      <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
        Realtime · Role-Aware · Secure
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
        <Link
          to="/demo/transition-channel"
          search={search}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          aria-label="Preview Transition Channel"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
        </Link>
        <Link
          to="/demo/transition-channel"
          search={search}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open Channel
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}
