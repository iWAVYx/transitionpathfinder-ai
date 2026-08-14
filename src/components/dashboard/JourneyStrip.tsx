import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Surface =
  | "family"
  | "student"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "admin";

type Step = { label: string; href: string; hint: string };

const FAMILY_STEPS: Step[] = [
  { label: "Add student", href: "/students", hint: "Create or connect to your student profile." },
  { label: "Upload IEP", href: "/documents", hint: "Add the IEP or transition document." },
  { label: "Review & profile", href: "/students", hint: "Review extracted info and fill in strengths, needs, voice." },
  { label: "Pathway Report", href: "/pathway", hint: "Generate the personalized roadmap." },
  { label: "Save resources & partners", href: "/resources", hint: "Save what's relevant to your student." },
  { label: "Action items", href: "/goals", hint: "Turn the report into next steps." },
  { label: "Meeting prep", href: "/ppt-prep", hint: "Bring it all to the next PPT or transition meeting." },
];

const STUDENT_STEPS: Step[] = [
  { label: "Your profile", href: "/students", hint: "Tell us who you are." },
  { label: "Student Voice", href: "/student-voice", hint: "Share what you want and what helps you." },
  { label: "Your Pathway", href: "/pathway", hint: "See your personalized plan." },
  { label: "Save resources", href: "/resources", hint: "Save things that interest you." },
  { label: "Action items", href: "/goals", hint: "Pick a next step." },
  { label: "Meeting prep", href: "/ppt-prep", hint: "Get ready for your next meeting." },
];

const EDUCATOR_STEPS: Step[] = [
  { label: "Caseload", href: "/caseload", hint: "Open the students you support." },
  { label: "Upload IEPs", href: "/documents", hint: "Add IEPs and transition documents." },
  { label: "Review profiles", href: "/students", hint: "Confirm extracted info per student." },
  { label: "Pathway Reports", href: "/reports", hint: "Generate or update reports." },
  { label: "Assign actions", href: "/goals", hint: "Turn recommendations into tasks." },
  { label: "Meeting prep", href: "/ppt-prep", hint: "Prep for upcoming PPT meetings." },
];

const SCHOOL_STEPS: Step[] = [
  { label: "School overview", href: "/school/overview", hint: "See planning status across your school." },
  { label: "Reports", href: "/school/reports", hint: "Track Pathway Report completion." },
  { label: "Team progress", href: "/school/team", hint: "Check case manager progress." },
  { label: "Implementation", href: "/school/implementation", hint: "Monitor adoption and gaps." },
];

const DISTRICT_STEPS: Step[] = [
  { label: "District overview", href: "/district/overview", hint: "See district-wide progress." },
  { label: "Schools", href: "/district/schools", hint: "Compare school-by-school completion." },
  { label: "Reports", href: "/district/reports", hint: "Aggregate transition readiness." },
  { label: "Team", href: "/district/team", hint: "Manage district staff." },
];

const PARTNER_STEPS: Step[] = [
  { label: "Partner profile", href: "/partners-manage", hint: "Complete your organization profile." },
  { label: "Add opportunities", href: "/partners-manage", hint: "Submit programs and services." },
  { label: "Keep deadlines current", href: "/partners-manage", hint: "Refresh application windows." },
  { label: "Review matches", href: "/opportunities", hint: "See where students are connecting." },
];

const ADMIN_STEPS: Step[] = [
  { label: "Inbox", href: "/admin", hint: "Triage waitlist and contact submissions." },
  { label: "Users", href: "/owner/users", hint: "Manage accounts and roles." },
  { label: "Resources", href: "/owner/resources", hint: "Curate the resource library." },
  { label: "Partners", href: "/owner/partner-submissions", hint: "Approve partner submissions." },
  { label: "System health", href: "/owner/health", hint: "Check platform health." },
];

const STEPS_BY_SURFACE: Record<Surface, Step[]> = {
  family: FAMILY_STEPS,
  student: STUDENT_STEPS,
  educator: EDUCATOR_STEPS,
  school_admin: SCHOOL_STEPS,
  district_admin: DISTRICT_STEPS,
  partner: PARTNER_STEPS,
  admin: ADMIN_STEPS,
};

const TITLE_BY_SURFACE: Record<Surface, string> = {
  family: "How TransitionForward works for families",
  student: "Your TransitionForward journey",
  educator: "How TransitionForward works for educators & case managers",
  school_admin: "How TransitionForward works for school admins",
  district_admin: "How TransitionForward works for districts",
  partner: "How TransitionForward works for partners",
  admin: "Platform admin workflow",
};

export function JourneyStrip({
  surface,
  currentStep,
  className,
}: {
  surface: Surface;
  /** 0-indexed — the step the user is currently on. Earlier steps render as complete. */
  currentStep?: number;
  className?: string;
}) {
  const storageKey = `tf.journeyStrip.${surface}.dismissed`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  if (dismissed) return null;

  const steps = STEPS_BY_SURFACE[surface];
  const title = TITLE_BY_SURFACE[surface];

  function handleDismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <section
      className={cn(
        "rounded-3xl border border-primary/15 bg-gradient-hero/60 p-4 shadow-soft sm:p-5",
        className,
      )}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            A-to-Z guide
          </p>
          <h3 className="mt-1 font-display text-base font-medium tracking-tight sm:text-lg">
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Hide this guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="mt-3 flex flex-wrap gap-2">
        {steps.map((step, idx) => {
          const isDone = typeof currentStep === "number" && idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <li key={step.label} className="flex items-center gap-1">
              <Link
                to={step.href}
                hash={`journey-${surface}-${idx}`}
                title={step.hint}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : isDone
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : (
                  <span className="text-[10px] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                )}
                {step.label}
              </Link>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
