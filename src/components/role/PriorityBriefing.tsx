import { AlertCircle, ArrowRight, CheckCircle2, Clock, Users, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type RoleKey =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner"
  | "owner";

type BriefingCopy = {
  headline: string;
  subline: string;
  needsAttention: { label: string; detail: string; severity: "high" | "med" | "low" }[];
  recentlyChanged: { label: string; when: string }[];
  nextBestStep: { label: string; cta: string; to?: string };
  whoIsInvolved: string[];
  connectedTo: string;
  complete: string[];
  missing: string[];
  timeSaved: string;
};

const COPY: Record<RoleKey, BriefingCopy> = {
  student: {
    headline: "Here's Your Snapshot",
    subline: "Small steps this week — nothing overwhelming.",
    needsAttention: [
      { label: "Confirm 2 interests", detail: "So we can match opportunities.", severity: "med" },
      { label: "Prep for PPT on Friday", detail: "3 talking points ready.", severity: "high" },
    ],
    recentlyChanged: [
      { label: "New report shared with you", when: "2 days ago" },
      { label: "Ms. Rivera added a note", when: "yesterday" },
    ],
    nextBestStep: { label: "Practice your PPT talking points", cta: "Open Meeting Prep" },
    whoIsInvolved: ["Case manager", "Family", "You"],
    connectedTo: "Your Pathway Report — Section: Student Voice",
    complete: ["Interests survey", "Strengths reflection"],
    missing: ["Post-school goal check-in"],
    timeSaved: "Saves you ~15 min of meeting prep this week.",
  },
  family: {
    headline: "Family Briefing",
    subline: "What needs your review, what's coming up, and who's helping.",
    needsAttention: [
      { label: "Sign updated consent", detail: "Required before the next PPT.", severity: "high" },
      { label: "Upload latest evaluation", detail: "Missing since April.", severity: "med" },
    ],
    recentlyChanged: [
      { label: "Report updated with new goals", when: "3 days ago" },
      { label: "New collaborator invited", when: "1 week ago" },
    ],
    nextBestStep: { label: "Review the updated Pathway Report together", cta: "Open Report" },
    whoIsInvolved: ["Case manager", "School counselor", "You"],
    connectedTo: "Pathway Report — Family Input section",
    complete: ["Contact info", "Consent (previous version)"],
    missing: ["Updated consent", "Evaluation upload"],
    timeSaved: "Saves ~30 min of paperwork juggling before the next meeting.",
  },
  educator: {
    headline: "Caseload Briefing",
    subline: "Sorted by what needs you most.",
    needsAttention: [
      { label: "3 students missing inputs", detail: "Report can't finalize.", severity: "high" },
      { label: "2 PPTs this week", detail: "Prep not started.", severity: "high" },
      { label: "5 action items overdue", detail: "Across 4 students.", severity: "med" },
    ],
    recentlyChanged: [
      { label: "Family uploaded new evaluation", when: "today" },
      { label: "Partner marked opportunity as filled", when: "yesterday" },
    ],
    nextBestStep: { label: "Open the 3 students missing inputs", cta: "Open Caseload" },
    whoIsInvolved: ["Families", "Related service providers", "Admin"],
    connectedTo: "Reports for 12 students on your caseload",
    complete: ["Consent tracking", "Draft agendas for 4 meetings"],
    missing: ["3 inputs", "2 meeting agendas"],
    timeSaved: "Saves ~2 hours of prep across the week.",
  },
  "school-admin": {
    headline: "School Health Snapshot",
    subline: "What's on track, what needs support, and where reports are at risk.",
    needsAttention: [
      { label: "2 grade bands behind", detail: "10th grade transition prep lagging.", severity: "high" },
      { label: "4 reports at risk", detail: "Missing inputs > 14 days.", severity: "med" },
    ],
    recentlyChanged: [
      { label: "3 staff joined this week", when: "this week" },
      { label: "Report completion up 12%", when: "last 30 days" },
    ],
    nextBestStep: { label: "Follow up with the 10th-grade team", cta: "Open Team View" },
    whoIsInvolved: ["Case managers", "Counselors", "District"],
    connectedTo: "Aggregate report health across 87 students",
    complete: ["Staff onboarding at 88%", "Consent tracking active"],
    missing: ["4 report reviews", "Team follow-up on 2 grade bands"],
    timeSaved: "Saves ~4 hours of manual status collection each week.",
  },
  "district-admin": {
    headline: "District Implementation Health",
    subline: "Where schools stand, and where to invest support next.",
    needsAttention: [
      { label: "2 schools behind on rollout", detail: "Below 50% adoption.", severity: "high" },
      { label: "Equity gap flagged", detail: "One grade band underserved.", severity: "med" },
    ],
    recentlyChanged: [
      { label: "New school onboarded", when: "2 weeks ago" },
      { label: "Overall readiness up 8%", when: "quarter to date" },
    ],
    nextBestStep: { label: "Schedule check-in with the 2 lagging schools", cta: "Open Schools" },
    whoIsInvolved: ["School admins", "State liaison"],
    connectedTo: "District-wide report metrics — 6 schools, 412 students",
    complete: ["4 schools past 75% adoption", "Quarterly report exported"],
    missing: ["2 school check-ins", "Equity review meeting"],
    timeSaved: "Replaces ~1 day/month of manual district roll-ups.",
  },
  partner: {
    headline: "Partner Briefing",
    subline: "Your active opportunities, deadlines, and impact.",
    needsAttention: [
      { label: "1 opportunity missing details", detail: "Fit criteria incomplete.", severity: "med" },
      { label: "Deadline in 5 days", detail: "Summer program applications.", severity: "high" },
    ],
    recentlyChanged: [
      { label: "3 new student matches", when: "this week" },
      { label: "Educator flagged 2 for follow-up", when: "yesterday" },
    ],
    nextBestStep: { label: "Complete the incomplete listing", cta: "Open Opportunity" },
    whoIsInvolved: ["Case managers", "Students & families"],
    connectedTo: "12 opportunities live · 34 students matched to date",
    complete: ["Partner profile", "Accessibility supports listed"],
    missing: ["Fit criteria on 1 listing", "Q4 impact report"],
    timeSaved: "Cuts opportunity coordination time roughly in half.",
  },
  owner: {
    headline: "Owner Console",
    subline: "Launch readiness, review queues, and next-best actions.",
    needsAttention: [
      { label: "3 launch blockers", detail: "Trust page copy, waitlist email, analytics tag.", severity: "high" },
      { label: "12 items in review queue", detail: "Partner submissions & feedback.", severity: "med" },
    ],
    recentlyChanged: [
      { label: "Waitlist +48 this week", when: "this week" },
      { label: "2 bugs closed", when: "yesterday" },
    ],
    nextBestStep: { label: "Clear the 3 launch blockers", cta: "Open Launch Checklist" },
    whoIsInvolved: ["Product", "Support", "Partners"],
    connectedTo: "Public launch readiness score",
    complete: ["Auth flows", "Role dashboards", "Demo suite"],
    missing: ["Trust page copy", "Analytics tag verified"],
    timeSaved: "Central console replaces 5+ scattered admin views.",
  },
};

function sevBadge(sev: "high" | "med" | "low") {
  const map = {
    high: "bg-destructive/10 text-destructive border-destructive/30",
    med: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    low: "bg-muted text-muted-foreground border-border",
  };
  return map[sev];
}

export function PriorityBriefing({ role }: { role: RoleKey }) {
  const c = COPY[role];
  return (
    <Card className="border-primary/20 shadow-soft">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Priority Briefing
            </p>
            <CardTitle className="mt-1 font-display text-2xl">{c.headline}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{c.subline}</p>
          </div>
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            <Clock className="mr-1 h-3 w-3" /> Updated just now
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Next best step */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Next Best Step
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{c.nextBestStep.label}</p>
            <NextBestStepLink role={role} label={c.nextBestStep.cta} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Needs attention */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" /> Needs Attention
            </p>
            <ul className="space-y-2">
              {c.needsAttention.map((item, i) => (
                <li key={i} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.label}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${sevBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Recently changed */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> What Changed
            </p>
            <ul className="space-y-2">
              {c.recentlyChanged.map((item, i) => (
                <li key={i} className="rounded-lg border bg-background p-3">
                  <p className="text-sm">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.when}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </p>
            <ul className="mt-2 space-y-1">
              {c.complete.map((x, i) => (
                <li key={i} className="text-xs text-foreground/80">• {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" /> Missing
            </p>
            <ul className="mt-2 space-y-1">
              {c.missing.map((x, i) => (
                <li key={i} className="text-xs text-foreground/80">• {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Who's Involved
            </p>
            <ul className="mt-2 space-y-1">
              {c.whoIsInvolved.map((x, i) => (
                <li key={i} className="text-xs text-foreground/80">• {x}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold text-foreground">Connected to:</span> {c.connectedTo}
            </span>
          </p>
          <p className="text-xs italic text-muted-foreground">{c.timeSaved}</p>
        </div>
      </CardContent>
    </Card>
  );
}
