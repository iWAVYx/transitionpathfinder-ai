import { Link } from "@tanstack/react-router";
import {
  FileUp,
  CheckCircle2,
  FileText,
  CalendarCheck2,
  ShieldCheck,
  Handshake,
  Mail,
  MessageSquare,
  History,
} from "lucide-react";
import type { ActivityEvent } from "@/lib/next-actions/types";

const ICON: Record<string, typeof History> = {
  upload: FileUp,
  step_completed: CheckCircle2,
  report_updated: FileText,
  meeting_noted: CalendarCheck2,
  access_changed: ShieldCheck,
  opportunity_status: Handshake,
  invitation_sent: Mail,
  invitation_accepted: Mail,
  comment: MessageSquare,
};

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ActivityHistoryList({
  events,
  emptyMessage = "No activity yet. Actions you complete will show up here.",
}: {
  events: ActivityEvent[];
  emptyMessage?: string;
}) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ol className="space-y-3" data-testid="activity-history-list">
      {events.map((e) => {
        const Icon = ICON[e.eventType] ?? History;
        const body = (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{e.subjectTitle}</p>
              <p className="text-xs text-muted-foreground">
                {e.actorLabel} · {timeAgo(e.occurredAt)}
              </p>
              {e.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
              ) : null}
            </div>
          </div>
        );
        return (
          <li
            key={e.id}
            className="rounded-xl border border-border/60 bg-card p-3"
          >
            {e.subjectRoute ? (
              <Link
                to={e.subjectRoute}
                className="block rounded-md hover:bg-muted/40"
                aria-label={`Open ${e.subjectTitle}`}
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
