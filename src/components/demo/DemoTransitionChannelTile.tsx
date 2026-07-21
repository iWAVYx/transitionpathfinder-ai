import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight, Eye, Bell, Pin, Users, Inbox } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useDemoChannelSummary, useDemoChannels } from "@/lib/demo/use-demo-channels";
import type { DemoRoleId } from "@/lib/demo/role-previews";

/**
 * Dashboard tile for Transition Channel. Matches the shared feature-tile
 * layout (status pill, two-column bullets, footer) and the same Preview +
 * CTA contract as PartnerNetworkTile. Preview opens a right-side sheet
 * with a role-aware at-a-glance view; Open Channel routes to the full
 * demo page.
 */
export function DemoTransitionChannelTile({
  role,
  contextId,
}: {
  role: DemoRoleId;
  contextId: string;
}) {
  const summary = useDemoChannelSummary(role, contextId);
  const [open, setOpen] = useState(false);
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          aria-label="Preview Transition Channel"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
        </button>
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

      <TransitionChannelPreviewDrawer
        role={role}
        contextId={contextId}
        open={open}
        onOpenChange={setOpen}
        search={search}
      />
    </div>
  );
}

function TransitionChannelPreviewDrawer({
  role,
  contextId,
  open,
  onOpenChange,
  search,
}: {
  role: DemoRoleId;
  contextId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: Record<string, string>;
}) {
  const { channels, connectionRequests, contextLabel } = useDemoChannels(role, contextId);
  const active = channels.filter((c) => !c.archived_at);
  const totalUnread = active.reduce((s, c) => s + (c.muted ? 0 : c.unread_count), 0);
  const pending = connectionRequests.filter((r) => r.status === "pending").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto overscroll-contain touch-pan-y p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b bg-muted/30 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <MessageSquare className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl">Transition Channel</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {contextLabel} · Preview
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 border-b bg-background px-6 py-4">
          <Stat icon={<MessageSquare className="h-3.5 w-3.5" />} label="Channels" value={active.length} />
          <Stat icon={<Bell className="h-3.5 w-3.5" />} label="Unread" value={totalUnread} />
          <Stat icon={<Inbox className="h-3.5 w-3.5" />} label="Requests" value={pending} />
        </div>

        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What You Can Do Here
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>• Send messages, pin decisions, and track action items.</li>
            <li>• Coordinate with family, educators, and community partners.</li>
            <li>• Respond to connection requests without exposing student PII.</li>
          </ul>
        </div>

        <div className="border-t px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Channels
          </h3>
          {active.length === 0 ? (
            <p className="mt-2 rounded-md border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
              No channels yet in this preview.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {active.slice(0, 4).map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c.pinned && <Pin className="h-3 w-3 text-primary" aria-hidden />}
                      <p className="truncate text-sm font-medium">{c.title}</p>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" aria-hidden />
                      {c.member_count} member{c.member_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  {!c.muted && c.unread_count > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {c.unread_count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto border-t bg-muted/20 px-6 py-4">
          <Link
            to="/demo/transition-channel"
            search={search}
            onClick={() => onOpenChange(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Open Channel
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Interactive demo · nothing sends
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
