import { useState } from "react";
import {
  Users,
  GraduationCap,
  School,
  Building2,
  Briefcase,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { DEMO_ROLE_VIEWS, type DemoRoleView } from "@/lib/demo-extras";
import type { DemoStudentId } from "@/lib/demo-data";
import { getDemoStudent } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<DemoRoleView, React.ReactNode> = {
  student: <UserCheck className="h-4 w-4" />,
  parent: <Users className="h-4 w-4" />,
  educator: <GraduationCap className="h-4 w-4" />,
  school: <School className="h-4 w-4" />,
  district: <Building2 className="h-4 w-4" />,
  partner: <Briefcase className="h-4 w-4" />,
  platform: <ShieldCheck className="h-4 w-4" />,
};

interface Props {
  student: DemoStudentId;
}

export function DemoRoleSwitcher({ student }: Props) {
  const [view, setView] = useState<DemoRoleView>("student");
  const bundle = getDemoStudent(student);
  const first = bundle.profile.first_name;
  const active = DEMO_ROLE_VIEWS.find((r) => r.id === view) ?? DEMO_ROLE_VIEWS[0];

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Role Dashboards
          </p>
          <h2 className="mt-1 font-display text-2xl">See {first}'s plan from any role.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Same student, role-aware view. Private detail is shielded from roles that
            don't need it.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> Role-scoped sample
        </Badge>
      </div>

      <div
        role="tablist"
        aria-label="Demo role view"
        className="no-scrollbar mt-5 -mx-1 flex flex-nowrap gap-1 overflow-x-auto px-1 pb-2"
      >
        {DEMO_ROLE_VIEWS.map((r) => {
          const isActive = r.id === view;
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setView(r.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {ICONS[r.id]}
              <span className="whitespace-nowrap">{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {active.label}
        </p>
        <p className="mt-1 font-display text-base">{active.tagline}</p>
        <ul className="mt-3 grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
          {ROLE_PANELS[view].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Why this matters for this role:{" "}
          <span className="text-foreground/80">{ROLE_WHY[view]}</span>
        </p>
      </div>
    </section>
  );
}

const ROLE_PANELS: Record<DemoRoleView, string[]> = {
  student: [
    "My next step (one clear action)",
    "Student Voice answers",
    "Plain-language Pathway Report link",
    "My action items + meeting prep",
    "Saved partner opportunities",
  ],
  parent: [
    "Family priorities at the top",
    "Document review + status",
    "Pathway Report review",
    "Meeting prep packet + questions to ask",
    "Resources matched to my child",
  ],
  educator: [
    "Sample caseload (3 fictional students)",
    "Missing-document and follow-up flags",
    "Pathway Report review queue",
    "Goals + action items by student",
    "Private case notes",
  ],
  school: [
    "Aggregate implementation snapshot",
    "Caseload coverage + staffing",
    "Reports completed this month",
    "Students needing follow-up (no PII)",
    "No private document detail surfaced",
  ],
  district: [
    "District adoption snapshot",
    "School-by-school progress",
    "Implementation support needs",
    "Aggregate transition reporting",
    "Equity and access trends",
  ],
  partner: [
    "Partner profile + program listings",
    "Opportunity statuses + interest counts",
    "PartnerForward incentives",
    "Strict privacy: no private student data",
    "Outreach tools (no PII)",
  ],
  platform: [
    "Waitlist and review queues",
    "Partner approval pipeline",
    "Resource moderation",
    "System health + launch readiness",
    "Admin access is logged",
  ],
};

const ROLE_WHY: Record<DemoRoleView, string> = {
  student: "Confidence and clarity — one next step at a time.",
  parent: "Family stays informed without becoming the case manager.",
  educator: "Focus on planning; cut documentation overhead.",
  school: "See implementation health without invading privacy.",
  district: "Make rollout decisions on real evidence.",
  partner: "Reach the right students without ever seeing private data.",
  platform: "Operate the network safely and transparently.",
};
