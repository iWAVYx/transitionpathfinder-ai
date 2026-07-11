/**
 * Admin Hub review-queues panel.
 *
 * One scannable surface where the platform admin can see every queue
 * awaiting attention with status badges and direct links into each.
 * Empty queues stay visible but render as a calm "All clear" state so
 * admins always know the queue exists.
 */
import { Link, useNavigate } from "@tanstack/react-router";
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
            Review queues
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Items waiting on a platform-admin decision.
          </p>
        </div>
        {!loading && counts && (
          <Badge variant={total > 0 ? "default" : "outline"} className="text-[11px]">
            {total > 0 ? `${total} awaiting review` : "All clear"}
          </Badge>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUEUES.map((q) => {
          const n = counts?.[q.key] ?? 0;
          const isEmpty = n === 0;
          const Icon = q.icon;
          return (
            <li key={q.key}>
              <Link
                to={q.href}
                aria-label={`Open ${q.label} (${n})`}
                className={
                  "group flex h-full flex-col justify-between rounded-2xl border bg-background p-4 transition-colors hover:bg-muted " +
                  (n > 0 && q.tone === "warn"
                    ? "border-amber-300/60"
                    : n > 0
                    ? "border-primary/40"
                    : "border-border")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={
                      "flex h-8 w-8 flex-none items-center justify-center rounded-full " +
                      (isEmpty
                        ? "bg-muted text-muted-foreground"
                        : q.tone === "warn"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-primary/10 text-primary")
                    }
                  >
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
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type { QueueCounts as ReviewQueueCounts };
