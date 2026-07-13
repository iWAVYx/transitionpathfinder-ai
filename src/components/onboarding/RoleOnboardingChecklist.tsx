import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";
import { Button } from "@/components/ui/button";

export type OnboardingStep = {
  id: string;
  label: string;
  hint: string;
  to?: string;
  cta?: string;
};

export type OnboardingRole =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner"
  | "owner";

const STORAGE_KEY = "tf.onboarding-progress.v1";

const STEPS_BY_ROLE: Record<OnboardingRole, OnboardingStep[]> = {
  student: [
    { id: "profile", label: "Complete Your Profile", hint: "Tell us who you are and what you want next.", to: "/onboarding", cta: "Open Profile" },
    { id: "voice", label: "Add Your Voice", hint: "Answer a few prompts so the plan sounds like you.", to: "/bridgeforward/voice", cta: "Answer Prompts" },
    { id: "review", label: "Review Your Pathway Report", hint: "See how your goals, docs, and voice come together.", to: "/pathway/student", cta: "Open Report" },
    { id: "meeting", label: "Prepare for Your Next Meeting", hint: "Pick your priorities and questions to ask.", to: "/meetings", cta: "Prep Meeting" },
    { id: "action", label: "Complete One Action Item", hint: "Small wins add up. Start with one.", to: "/action-items", cta: "See Actions" },
  ],
  family: [
    { id: "profile", label: "Complete Your Family Profile", hint: "Share your priorities and communication needs.", to: "/family/priorities", cta: "Open Priorities" },
    { id: "consent", label: "Review Consent & Sharing", hint: "Choose who can see what — you're in control.", to: "/family/consent", cta: "Review Sharing" },
    { id: "document", label: "Upload the Current IEP", hint: "We'll draft plain-language highlights for review.", to: "/documents", cta: "Upload IEP" },
    { id: "team", label: "Invite Your Team", hint: "Add caregivers, advocates, and school contacts.", to: "/family/invites", cta: "Invite Team" },
    { id: "meeting", label: "Prepare for the Next Meeting", hint: "Bring your questions and priorities in writing.", to: "/meetings", cta: "Prep Meeting" },
  ],
  educator: [
    { id: "caseload", label: "Confirm Your Caseload", hint: "Make sure every student on your list is correct.", to: "/caseload", cta: "Open Caseload" },
    { id: "documents", label: "Review Pending Documents", hint: "Accept or edit AI-drafted document sections.", to: "/educator/document-review", cta: "Review Docs" },
    { id: "pending", label: "Resolve Pending Input", hint: "Answer families and coordinators waiting on you.", to: "/educator/pending-input", cta: "Open Queue" },
    { id: "gaps", label: "Check Readiness Gaps", hint: "See where students need targeted supports.", to: "/educator/readiness-gaps", cta: "See Gaps" },
    { id: "actions", label: "Log One Meeting Follow-Up", hint: "Turn a decision into an owned action item.", to: "/educator/action-items", cta: "Add Action" },
  ],
  "school-admin": [
    { id: "team", label: "Confirm School Staff Access", hint: "Match educators to caseloads and roles.", to: "/admin-school", cta: "Manage Staff" },
    { id: "health", label: "Review Implementation Health", hint: "See usage, completion, and current risks.", to: "/school/implementation", cta: "Open Health" },
    { id: "compliance", label: "Check Transition Compliance", hint: "Confirm required forms and signatures.", to: "/school/implementation", cta: "Open Compliance" },
    { id: "families", label: "Invite Families of Active Students", hint: "Families in the platform doubles follow-through.", to: "/family/invites", cta: "Send Invites" },
    { id: "export", label: "Export Your First Summary", hint: "Bring numbers to your next leadership meeting.", to: "/school/implementation", cta: "Export" },
  ],
  "district-admin": [
    { id: "schools", label: "Confirm School Roster", hint: "Every school with transition-age students should be listed.", to: "/district/schools", cta: "Open Schools" },
    { id: "health", label: "Review District Health", hint: "Comparison, trends, and risk flags in one view.", to: "/district/implementation", cta: "Open Health" },
    { id: "trends", label: "Check Readiness Trends", hint: "See where the district is improving and where it isn't.", to: "/district/readiness-trends", cta: "Open Trends" },
    { id: "gaps", label: "Review Service Gaps", hint: "Find schools that need targeted support this quarter.", to: "/district/service-gaps", cta: "Open Gaps" },
    { id: "reports", label: "Publish A District Report", hint: "Share progress with the board or state.", to: "/district/reports", cta: "Publish Report" },
  ],
  partner: [
    { id: "profile", label: "Complete Your Partner Profile", hint: "The information families and schools see first.", to: "/hubs/partner", cta: "Open Profile" },
    { id: "opportunities", label: "Post At Least One Opportunity", hint: "Programs with open opportunities get matched.", to: "/opportunities", cta: "Post Opportunity" },
    { id: "supports", label: "Add Accessibility Supports", hint: "Show what's available — sensory, communication, coaching.", to: "/opportunities", cta: "Add Supports" },
    { id: "outcomes", label: "Log Your First Outcome", hint: "Verified outcomes earn PartnerForward standing.", to: "/opportunities", cta: "Log Outcome" },
    { id: "team", label: "Invite Program Staff", hint: "Give your team access to shared students.", to: "/hubs/partner", cta: "Invite Team" },
  ],
  owner: [
    { id: "orgs", label: "Confirm Organizations", hint: "Districts, schools, and partners set up correctly.", to: "/admin", cta: "Open Orgs" },
    { id: "roles", label: "Assign Owner-Level Roles", hint: "Keep privileged access to a small trusted set.", to: "/admin", cta: "Manage Roles" },
    { id: "usage", label: "Review Platform Usage", hint: "Where value is landing across all tenants.", to: "/insights", cta: "Open Insights" },
    { id: "readiness", label: "Check Launch Readiness", hint: "Compliance, monitoring, and support coverage.", to: "/admin", cta: "Open Readiness" },
    { id: "publish", label: "Publish The Next Release", hint: "Ship the calm, clear improvements queued up.", cta: "Open Release Notes" },
  ],
};

interface Props {
  role: OnboardingRole;
  className?: string;
}

export function RoleOnboardingChecklist({ role, className }: Props) {
  const steps = STEPS_BY_ROLE[role];
  const key = `${STORAGE_KEY}:${role}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDone(JSON.parse(raw));
      if (localStorage.getItem(`${key}:dismissed`) === "1") setDismissed(true);
    } catch {
      // ignore
    }
  }, [key]);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const completed = useMemo(
    () => steps.filter((s) => done[s.id]).length,
    [steps, done],
  );
  const pct = Math.round((completed / steps.length) * 100);

  if (dismissed || pct === 100) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="onboarding-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tf-eyebrow inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> {toTitleCase("Get Started")}
          </p>
          <h3
            id="onboarding-heading"
            className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
          >
            {toTitleCase("Your Next Five Steps")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick, ordered path to getting real value from TransitionForward.
            Nothing here is busywork.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl">{pct}%</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {completed}/{steps.length} done
          </p>
        </div>
      </header>

      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 divide-y rounded-xl border">
        {steps.map((s) => {
          const isDone = !!done[s.id];
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                aria-pressed={isDone}
              >
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {toTitleCase(s.label)}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </button>
              {s.to && (
                <Button asChild size="sm" variant={isDone ? "outline" : "default"}>
                  <Link to={s.to}>{s.cta ?? "Open"}</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            try {
              localStorage.setItem(`${key}:dismissed`, "1");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
        >
          Hide this checklist
        </button>
      </div>
    </section>
  );
}
