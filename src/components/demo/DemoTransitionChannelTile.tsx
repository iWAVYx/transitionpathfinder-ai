import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight, Bell } from "lucide-react";
import { useDemoChannelSummary } from "@/lib/demo/use-demo-channels";
import type { DemoRoleId } from "@/lib/demo/role-previews";

/**
 * Dashboard tile that mirrors the signed-in Transition Channel tile but
 * reads from the demo store. Links to `/demo/transition-channel` with the
 * role + context id preserved so the dedicated page opens with the same
 * fictional conversations shown here.
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
  // Preserve the student selector search param for continuity across nav.
  if (role === "student" || role === "family" || role === "educator") {
    search.student = contextId;
  }

  return (
    <Link
      to="/demo/transition-channel"
      search={search}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      aria-label={`Preview Transition Channel for ${summary.contextLabel}`}
    >
      <span
        className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-primary">
              Transition Channel
            </div>
            <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
              {summary.contextLabel}
            </h3>
          </div>
        </div>
        {summary.unread > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground"
            aria-label={`${summary.unread} unread messages`}
          >
            <Bell className="h-3 w-3" aria-hidden />
            {summary.unread}
          </span>
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">
        Communicate, coordinate next steps, and keep important transition
        conversations connected.
      </p>

      <ul className="mx-3.5 mt-2.5 space-y-1.5" aria-label="Recent channels">
        {summary.top.length === 0 ? (
          <li className="rounded-md border border-dashed border-border/60 px-2.5 py-2 text-[12px] text-muted-foreground">
            No channels yet in this preview.
          </li>
        ) : (
          summary.top.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-[12.5px]"
            >
              <span className="min-w-0 truncate">{c.title}</span>
              {c.unread > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </li>
          ))
        )}
      </ul>

      <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {summary.channelCount} channel{summary.channelCount === 1 ? "" : "s"}
        {summary.pendingRequests > 0 ? ` · ${summary.pendingRequests} pending request${summary.pendingRequests === 1 ? "" : "s"}` : ""}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
        <span className="text-[11px] font-medium text-muted-foreground">Interactive demo · nothing sends</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Open Channel
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
