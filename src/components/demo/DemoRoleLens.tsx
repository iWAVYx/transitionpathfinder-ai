import {
  Briefcase,
  Building2,
  GraduationCap,
  Lock,
  School,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DEMO_ROLE_VIEWS,
  DEMO_STEP_LENSES,
  type DemoLensStep,
  type DemoRoleView,
} from "@/lib/demo-extras";
import { getDemoStudent, type DemoStudentId } from "@/lib/demo-data";
import { useDemoRoleView } from "@/hooks/use-demo-role-view";

const ICONS: Record<DemoRoleView, React.ReactNode> = {
  student: <UserCheck className="h-3.5 w-3.5" />,
  parent: <Users className="h-3.5 w-3.5" />,
  educator: <GraduationCap className="h-3.5 w-3.5" />,
  school: <School className="h-3.5 w-3.5" />,
  district: <Building2 className="h-3.5 w-3.5" />,
  partner: <Briefcase className="h-3.5 w-3.5" />,
  platform: <ShieldCheck className="h-3.5 w-3.5" />,
};

const STEP_LABELS: Record<DemoLensStep, string> = {
  intake: "Intake",
  report: "Pathway Report",
  resources: "Resources",
  opportunities: "Opportunities",
  plan: "Action Plan",
  hub: "Student Hub",
};

interface Props {
  step: DemoLensStep;
  student: DemoStudentId;
  /** Hide the explanatory header (when used inline beneath another panel). */
  dense?: boolean;
}

/**
 * Shared role-view lens used across every demo step.
 *
 * The selected role persists across step navigations (sessionStorage),
 * so choosing "Educator" on /demo/intake carries through to /demo/report,
 * /demo/plan, etc. — making the whole walkthrough role-consistent.
 */
export function DemoRoleLens({ step, student, dense = false }: Props) {
  const [view, setView] = useDemoRoleView();
  const bundle = getDemoStudent(student);
  const first = bundle.profile.first_name;
  const content = DEMO_STEP_LENSES[step][view];
  const role = DEMO_ROLE_VIEWS.find((r) => r.id === view) ?? DEMO_ROLE_VIEWS[0];

  return (
    <section
      aria-label={`Role view for ${STEP_LABELS[step]}`}
      className="demo-shell demo-reveal rounded-3xl border border-demo bg-card p-5 shadow-demo-lift sm:p-6"
    >
      {!dense && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
              {STEP_LABELS[step]} · Role view
            </p>
            <p className="mt-1 text-sm text-foreground/75">
              Same {first.toLowerCase()} sample — see how this step changes for each role.
              Your choice carries to the next demo step.
            </p>
          </div>
          <Badge variant="outline" className="gap-1 border-demo text-[11px]">
            <ShieldCheck className="h-3 w-3" /> Role-scoped sample
          </Badge>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Demo role view"
        className={`no-scrollbar -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-2 ${
          dense ? "" : "mt-4"
        }`}
      >
        {DEMO_ROLE_VIEWS.map((r) => {
          const isActive = r.id === view;
          return (
            <button
              key={r.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setView(r.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "demo-chip-active border-transparent"
                  : "border-demo/60 bg-background text-foreground/70 hover:text-foreground hover:border-demo"
              }`}
            >
              {ICONS[r.id]}
              <span className="whitespace-nowrap">{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="demo-reveal mt-4 rounded-2xl border border-demo/60 bg-demo-surface-warm/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-demo-primary px-2.5 py-0.5 text-[11px] font-semibold">
            <Sparkles className="h-3 w-3" />
            {role.label}
          </span>
          <span className="text-[11px] text-foreground/70">{role.tagline}</span>
        </div>
        <p className="mt-2 text-base font-semibold leading-snug text-foreground">{content.headline}</p>
        <ul className="mt-3 grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
          {content.bullets.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--demo-accent)]"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-foreground/70">
          <span className="font-semibold text-foreground/85">Why this matters:</span>{" "}
          {content.why}
        </p>
        {content.privacy && (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-foreground/70">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{content.privacy}</span>
          </p>
        )}
      </div>
    </section>
  );
}
