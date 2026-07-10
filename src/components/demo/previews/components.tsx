/**
 * Demo Workspace in-place preview components.
 *
 * Each preview is a small, static, presentational panel that renders inside
 * a `DemoToolPreviewCard` (via its `footer` or an expandable disclosure) so
 * signed-out visitors can peek at what a real workflow looks like — without
 * leaving the demo page.
 *
 * All data is fictional. No real students, caseloads, or organizations.
 * Keep each preview short (≤ ~10 lines of rendered content) and read-only.
 *
 * To add a new preview:
 *   1. Write a `PreviewX` component below.
 *   2. Register it in `DEMO_PREVIEWS` with a stable id.
 *   3. Reference the id from `role-previews.ts` via `previewId`.
 */

import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  School,
  Handshake,
  BookmarkCheck,
  ShieldCheck,
  Building2,
  Activity,
  Award,
  Inbox,
  Megaphone,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-xs">
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  right,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: ReactNode;
  right?: ReactNode;
  tone?: "default" | "success" | "warning" | "critical" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "critical"
          ? "text-destructive"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <li className="flex items-center justify-between gap-2 border-b border-dashed border-border/40 py-1.5 last:border-b-0">
      <span className={`flex min-w-0 items-center gap-2 ${toneClass}`}>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </span>
      {right ? (
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {right}
        </span>
      ) : null}
    </li>
  );
}

function Bar({ value, tone = "default" }: { value: number; tone?: "default" | "success" | "warning" }) {
  const bg =
    tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${bg}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Family / Student / Educator previews                                       */
/* -------------------------------------------------------------------------- */

export function PreviewCalendar() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={CalendarDays} label="Annual PPT · Jordan Rivera" right="Sep 15 · 10:00" />
        <Row icon={CalendarDays} label="Career shadow visit" right="Sep 22" tone="warning" />
        <Row icon={CalendarDays} label="Transition Fair · Hartford" right="Oct 03" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewMeetingPrep() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={CheckCircle2} label="Questions drafted (3)" tone="success" />
        <Row icon={Circle} label="Agenda shared with team" tone="muted" />
        <Row icon={Circle} label="Family priorities attached" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewSavedResources() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={BookmarkCheck} label="CT Age of Majority guide" right="PDF" />
        <Row icon={BookmarkCheck} label="Bureau of Rehab Services intake" right="Link" />
        <Row icon={BookmarkCheck} label="Self-advocacy checklist" right="Doc" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewDocuments() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={FileText} label="IEP · 2024-05-12" right="On file" tone="success" />
        <Row icon={FileText} label="Psych eval · 2023-11-02" right="On file" tone="success" />
        <Row icon={AlertTriangle} label="Latest IEP awaiting upload" right="Needed" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewConsent() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={ShieldCheck} label="Case manager · view + edit" tone="success" />
        <Row icon={ShieldCheck} label="Family advocate · view only" tone="success" />
        <Row icon={Circle} label="Partner agency (not shared)" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewCaseload() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Users} label="Jordan Rivera · Grade 11" right="Report ready" tone="success" />
        <Row icon={Users} label="Alex Chen · Grade 12" right="3 gaps" tone="warning" />
        <Row icon={Users} label="Maya Patel · Grade 10" right="Intake open" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewReadinessGaps() {
  return (
    <PreviewFrame>
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between"><span>Employment</span><span className="text-muted-foreground">62%</span></div>
          <Bar value={62} tone="warning" />
        </div>
        <div>
          <div className="mb-1 flex justify-between"><span>Independent living</span><span className="text-muted-foreground">48%</span></div>
          <Bar value={48} tone="warning" />
        </div>
        <div>
          <div className="mb-1 flex justify-between"><span>Postsecondary</span><span className="text-muted-foreground">81%</span></div>
          <Bar value={81} tone="success" />
        </div>
      </div>
    </PreviewFrame>
  );
}

export function PreviewNotes() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={FileText} label="Jordan — strong verbal advocacy" right="2d ago" />
        <Row icon={FileText} label="Alex — needs job-shadow follow-up" right="5d ago" tone="warning" />
        <Row icon={FileText} label="Maya — family requested Spanish resources" right="1w ago" />
      </ul>
    </PreviewFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* School / District previews                                                 */
/* -------------------------------------------------------------------------- */

export function PreviewTeamActivity() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Activity} label="M. Alvarez · added educator note" right="1h" />
        <Row icon={Activity} label="J. Kim · generated Pathway Report" right="3h" />
        <Row icon={Activity} label="T. Rowe · uploaded IEP" right="today" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewReportCompletion() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Circle} label="Grade 9" right="12 / 34" tone="warning" />
        <Row icon={Circle} label="Grade 10" right="21 / 30" tone="warning" />
        <Row icon={CheckCircle2} label="Grade 11" right="28 / 29" tone="success" />
        <Row icon={CheckCircle2} label="Grade 12" right="22 / 22" tone="success" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewTrends() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={TrendingUp} label="Employment readiness" right="+8 pts / 90d" tone="success" />
        <Row icon={TrendingUp} label="Family engagement" right="+4 pts" tone="success" />
        <Row icon={Minus} label="Postsecondary planning" right="flat" tone="muted" />
        <Row icon={TrendingDown} label="Community access" right="-3 pts" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewSchoolsList() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={School} label="Hartford Regional HS" right="82% ready" tone="success" />
        <Row icon={School} label="Bristol Central HS" right="67% ready" tone="warning" />
        <Row icon={School} label="New Britain HS" right="54% ready" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewSchoolProgress() {
  return (
    <PreviewFrame>
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between"><span>Hartford Regional</span><span className="text-muted-foreground">82%</span></div>
          <Bar value={82} tone="success" />
        </div>
        <div>
          <div className="mb-1 flex justify-between"><span>Bristol Central</span><span className="text-muted-foreground">67%</span></div>
          <Bar value={67} tone="warning" />
        </div>
        <div>
          <div className="mb-1 flex justify-between"><span>New Britain</span><span className="text-muted-foreground">54%</span></div>
          <Bar value={54} tone="warning" />
        </div>
      </div>
    </PreviewFrame>
  );
}

export function PreviewServiceGaps() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={AlertTriangle} label="Job coaching · 14 students unmatched" tone="warning" />
        <Row icon={AlertTriangle} label="Transportation training · 9 unmatched" tone="warning" />
        <Row icon={AlertTriangle} label="Assistive tech evals · 4 waiting" tone="critical" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewResourceUsage() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={BookmarkCheck} label="CT-SEDS quick reference" right="34 saves" />
        <Row icon={BookmarkCheck} label="Age of Majority guide" right="27 saves" />
        <Row icon={BookmarkCheck} label="BRS referral packet" right="19 saves" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewSupportNeeds() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={AlertTriangle} label="Missing family input · 7 students" tone="warning" />
        <Row icon={AlertTriangle} label="Missing student voice · 5 students" tone="warning" />
        <Row icon={CheckCircle2} label="Reports current · 118 students" tone="success" />
      </ul>
    </PreviewFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Partner previews                                                           */
/* -------------------------------------------------------------------------- */

export function PreviewOpportunities() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Handshake} label="Summer paid internship" right="Published" tone="success" />
        <Row icon={Handshake} label="Career shadow · fall cohort" right="Published" tone="success" />
        <Row icon={Handshake} label="Peer mentor program" right="Draft" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewDeadlines() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Clock} label="Summer internship apps close" right="Mar 31" tone="warning" />
        <Row icon={Clock} label="Fall shadow signups open" right="Aug 12" />
        <Row icon={Clock} label="Peer mentor rolling" right="Ongoing" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewPartnerForward() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Award} label="Employer incentive grant" right="Up to $2.5k" tone="success" />
        <Row icon={Award} label="Coaching stipend" right="$500 / student" tone="success" />
        <Row icon={Award} label="Recognition badge" right="Auto" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewPartnerProfile() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Building2} label="Organization · Riverbend Manufacturing" />
        <Row icon={Circle} label="Service areas · Hartford, Middlesex" tone="muted" />
        <Row icon={CheckCircle2} label="Profile complete" tone="success" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewPartnerSubmissions() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Inbox} label="Summer paid internship" right="Awaiting review" tone="warning" />
        <Row icon={Inbox} label="Peer mentor program" right="Awaiting review" tone="warning" />
        <Row icon={CheckCircle2} label="Fall shadow · approved" right="Live" tone="success" />
      </ul>
    </PreviewFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Platform Admin (Owner Hub) previews                                        */
/* -------------------------------------------------------------------------- */

export function PreviewWaitlist() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Users} label="Windsor Public Schools" right="District" tone="warning" />
        <Row icon={Users} label="Middletown SPED coop" right="Regional" tone="warning" />
        <Row icon={Users} label="Bridgeport HS #4" right="School" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewContacts() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Users} label="J. Alvarez · Director, CT-SDE" right="Warm" tone="success" />
        <Row icon={Users} label="R. Kim · Superintendent, Windsor" right="Follow-up" tone="warning" />
        <Row icon={Users} label="T. Rowe · SPED lead, Bristol" right="New" tone="muted" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewResourceQueue() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Inbox} label="12 resources pending review" tone="warning" />
        <Row icon={CheckCircle2} label="4 approved today" tone="success" />
        <Row icon={AlertTriangle} label="2 flagged for accuracy" tone="critical" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewSystemHealth() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={CheckCircle2} label="API · healthy" right="99.98%" tone="success" />
        <Row icon={CheckCircle2} label="Auth · healthy" right="99.99%" tone="success" />
        <Row icon={AlertTriangle} label="Report worker · degraded" right="p95 8.2s" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

export function PreviewOutreach() {
  return (
    <PreviewFrame>
      <ul>
        <Row icon={Megaphone} label="Pilot outreach · 8 in flight" tone="warning" />
        <Row icon={Megaphone} label="Newsletter · sent Fri" right="42% open" tone="success" />
        <Row icon={Megaphone} label="Conference follow-ups · 3 due" tone="warning" />
      </ul>
    </PreviewFrame>
  );
}

/* Registry lives in ./index.tsx (lazy-loaded with skeleton + error boundary). */

