/**
 * Admin Hub review-queues panel.
 *
 * One scannable surface where the platform admin can see every queue
 * awaiting attention with status badges and direct links into each.
 * Empty queues stay visible but render as a calm "All clear" state so
 * admins always know the queue exists.
 */
import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Mail,
  Handshake,
  Megaphone,
  MessageSquareWarning,
  Bug,
  UserPlus,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type QueueCounts = {
  waitlistNew: number;
  contactsNew: number;
  partnerSubmissions: number;
  partnerOpportunities: number;
  feedbackOpen: number;
  productIssuesOpen: number;
  adminInvitationsPending: number;
  betaTestersPending: number;
};

type Queue = {
  key: keyof QueueCounts;
  label: string;
  href: string;
  icon: typeof ClipboardList;
  tone: "default" | "warn";
};

const QUEUES: Queue[] = [
  { key: "waitlistNew", label: "Waitlist · new", href: "/owner/waitlist", icon: ClipboardList, tone: "default" },
  { key: "contactsNew", label: "Contact submissions", href: "/owner/contacts", icon: Mail, tone: "default" },
  { key: "partnerSubmissions", label: "Partner submissions", href: "/owner/partner-submissions", icon: Handshake, tone: "default" },
  { key: "partnerOpportunities", label: "Opportunities to approve", href: "/owner/opportunities", icon: Megaphone, tone: "default" },
  { key: "feedbackOpen", label: "Feedback open", href: "/owner/feedback", icon: MessageSquareWarning, tone: "default" },
  { key: "productIssuesOpen", label: "Product issues", href: "/owner/issues", icon: Bug, tone: "warn" },
  { key: "adminInvitationsPending", label: "Admin invitations pending", href: "/owner/admins", icon: UserPlus, tone: "default" },
  { key: "betaTestersPending", label: "Beta testers pending", href: "/owner/beta-testers", icon: Sparkles, tone: "default" },
];

export function ReviewQueuesPanel({
  counts,
  loading,
}: {
  counts: QueueCounts | null;
  loading: boolean;
}) {
  const navigate = useNavigate();
  const total = counts
    ? QUEUES.reduce((sum, q) => sum + (counts[q.key] ?? 0), 0)
    : 0;

  return (
    <section
      aria-label="Review queues"
      className="space-y-3 sm:space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Review Queues
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Items waiting on a platform-admin decision. Open the sidebar to jump into a specific queue at any time.
          </p>
        </div>
        {!loading && counts && (
          <Badge variant={total > 0 ? "default" : "outline"} className="text-[11px]">
            {total > 0 ? `${total} awaiting review` : "All clear"}
          </Badge>
        )}
      </div>

      <ul className="grid divide-y divide-border/60 border-y border-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {QUEUES.map((q) => {
          const n = counts?.[q.key] ?? 0;
          const isEmpty = n === 0;
          const Icon = q.icon;
          const cardClass =
            "group flex h-full w-full flex-col justify-between px-2 py-4 text-left transition-colors hover:bg-muted/40 sm:px-4 " +
            (n > 0 && q.tone === "warn"
              ? "bg-amber-500/5"
              : n > 0
              ? "bg-primary/5"
              : "");
          const iconClass =
            "flex h-8 w-8 flex-none items-center justify-center rounded-full " +
            (isEmpty
              ? "text-muted-foreground"
              : q.tone === "warn"
              ? "text-amber-700"
              : "text-primary");
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className={iconClass}>
                  {isEmpty ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <Badge
                  variant={isEmpty ? "outline" : "default"}
                  className="text-[11px]"
                >
                  {loading ? "…" : isEmpty ? "0" : String(n)}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium leading-snug">{q.label}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isEmpty ? "Nothing to review" : "Open queue →"}
                </p>
              </div>
            </>
          );
          return (
            <li key={q.key}>
              {/*
                Render queues as buttons that navigate on click rather than
                anchors, so the same destinations linked from the Admin Hub
                sidebar (outside <main>) never register as duplicate hrefs
                inside <main>. Sidebar remains the canonical navigation;
                these tiles are the actionable dashboard summary.
              */}
              <button
                type="button"
                onClick={() => navigate({ to: q.href })}
                aria-label={`Open ${q.label} (${n})`}
                className={cardClass}
              >
                {inner}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


export type { QueueCounts as ReviewQueueCounts };
