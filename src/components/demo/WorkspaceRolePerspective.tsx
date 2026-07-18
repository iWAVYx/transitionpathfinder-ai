import { Eye, HeartHandshake, ClipboardCheck } from "lucide-react";
import type { DemoRoleId } from "@/lib/demo/role-previews";
import type { StageId } from "@/lib/workspace/stages";

type Perspective = {
  eyebrow: string;
  focus: string;
  priorities: string[];
  actions: string[];
  contribution: string;
  icon: typeof Eye;
  accent: string;
};

const BASE: Record<"student" | "family" | "educator", Omit<Perspective, "priorities" | "actions" | "contribution">> = {
  student: {
    eyebrow: "Student View",
    focus: "\n",
    icon: Eye,
    accent: "text-sky-700 bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900",
  },
  family: {
    eyebrow: "Family View",
    focus: "Observations, logistics, and how to support without replacing your student's voice.",
    icon: HeartHandshake,
    accent: "text-rose-700 bg-rose-50 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900",
  },
  educator: {
    eyebrow: "Educator / Case Manager View",
    focus: "Evidence, planning gaps, and preparation for the next meeting.",
    icon: ClipboardCheck,
    accent: "text-emerald-700 bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
  },
};

/** Per-stage priority/action shifts for each workspace role. */
const STAGE_LENS: Partial<Record<StageId, Record<"student" | "family" | "educator", { priorities: string[]; actions: string[]; contribution: string }>>> = {
  start: {
    student: {
      priorities: ["What excites you", "What feels hard", "What you want people to know"],
      actions: ["Add your voice", "Save an interest", "Set a personal goal"],
      contribution: "Student Voice",
    },
    family: {
      priorities: ["Home context", "Transportation & schedule", "Consent & signatures"],
      actions: ["Add a family note", "Confirm consent", "Flag a logistics question"],
      contribution: "Family Input",
    },
    educator: {
      priorities: ["Baseline evidence", "Planning gaps", "Meeting prep"],
      actions: ["Attach an assessment", "Note a planning gap", "Schedule the intake meeting"],
      contribution: "Educator Evidence",
    },
  },
  voice: {
    student: { priorities: ["Say it your way", "Choose what to share", "Keep it private if you want"], actions: ["Record voice", "Type reflection", "Mark private"], contribution: "Student Voice" },
    family: { priorities: ["Reinforce, don't replace", "Note context, not answers", "Flag concerns respectfully"], actions: ["Add supporting note", "Flag a concern"], contribution: "Family Input" },
    educator: { priorities: ["Prompt without leading", "Capture themes", "Link to goals"], actions: ["Add facilitation note", "Tag a theme"], contribution: "Educator Evidence" },
  },
  family: {
    student: { priorities: ["What I want family to know", "Where I want privacy"], actions: ["Share a note with family", "Mark something private"], contribution: "Student Voice" },
    family: { priorities: ["Daily-life observations", "History & continuity", "Questions to raise"], actions: ["Add a family observation", "Attach relevant history", "Draft a question"], contribution: "Family Input" },
    educator: { priorities: ["Family context on file", "Cultural & linguistic fit"], actions: ["Log family meeting", "Request an interpreter"], contribution: "Educator Evidence" },
  },
  school: {
    student: { priorities: ["What's working at school", "What I want to change"], actions: ["Add a school reflection"], contribution: "Student Voice" },
    family: { priorities: ["School communication", "Attendance & scheduling"], actions: ["Message the team", "Confirm schedule"], contribution: "Family Input" },
    educator: { priorities: ["Assessment coverage", "Documented needs", "Team recommendations"], actions: ["Upload assessment", "Confirm documented needs", "Assign a follow-up"], contribution: "Educator Evidence" },
  },
  evidence: {
    student: { priorities: ["See what's on file", "Understand what it means"], actions: ["Read the plain-language summary"], contribution: "Student Voice" },
    family: { priorities: ["Confirm accuracy", "Ask about anything unclear"], actions: ["Flag a document question", "Request a copy"], contribution: "Family Input" },
    educator: { priorities: ["Verify current records", "Redact PII as needed", "Cite evidence"], actions: ["Upload document", "Verify record", "Redact & share"], contribution: "Uploaded Document" },
  },
  ready: {
    student: { priorities: ["Am I ready?", "What I still want help with"], actions: ["Confirm readiness", "Ask for support"], contribution: "Student Voice" },
    family: { priorities: ["Home support alignment", "Deadlines & handoffs"], actions: ["Confirm home support", "Add a deadline"], contribution: "Family Input" },
    educator: { priorities: ["Readiness rubric", "Assigned responsibilities", "Progress monitoring"], actions: ["Score readiness", "Assign a responsibility", "Schedule progress check"], contribution: "Educator Evidence" },
  },
  roadmap: {
    student: { priorities: ["My story in plain language", "What I'll try next"], actions: ["Share with someone I trust"], contribution: "Student Voice" },
    family: { priorities: ["Report summary you can use", "Family checklist"], actions: ["Download family summary"], contribution: "Family Input" },
    educator: { priorities: ["Full evidence trail", "Team recommendations", "Version history"], actions: ["Export report", "Approve current version"], contribution: "Verified Record" },
  },
  action: {
    student: { priorities: ["Small next steps", "What I saved"], actions: ["Save an opportunity", "Ask a question about one"], contribution: "Student Voice" },
    family: { priorities: ["Logistics that work", "Cost & transportation", "Safety"], actions: ["Ask about transportation", "Flag a logistics conflict"], contribution: "Family Input" },
    educator: { priorities: ["Match evidence", "Provider capacity", "Continuity of supports"], actions: ["Recommend a program", "Confirm eligibility"], contribution: "Engine Recommendation" },
  },
  connect: {
    student: { priorities: ["Who I'll meet", "What to expect"], actions: ["Confirm attendance"], contribution: "Student Voice" },
    family: { priorities: ["Introductions & consent", "Scheduling"], actions: ["Approve introduction", "Confirm consent"], contribution: "Family Input" },
    educator: { priorities: ["Partner readiness", "Handoff notes"], actions: ["Send handoff packet", "Log intro meeting"], contribution: "Educator Evidence" },
  },
};

/**
 * WorkspaceRolePerspective — role-aware framing band for the Transition
 * Workspace. Same underlying student/stage/data; the presentation lens
 * shifts to the priorities and actions that matter for the selected role.
 *
 * Only renders for the three workspace roles (Student / Family /
 * Educator). Non-workspace roles are routed to their own dashboards by
 * the enclosing page.
 */
export function WorkspaceRolePerspective({
  role,
  stageId,
}: {
  role: DemoRoleId;
  stageId: StageId;
}) {
  if (role !== "student" && role !== "family" && role !== "educator") return null;
  const base = BASE[role];
  const stage = STAGE_LENS[stageId]?.[role];
  const priorities = stage?.priorities ?? [];
  const actions = stage?.actions ?? [];
  const contribution = stage?.contribution ?? "Student Voice";
  const Icon = base.icon;
  return (
    <section
      aria-label={`${base.eyebrow} for this stage`}
      className="mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${base.accent}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${base.accent}`}>
            {base.eyebrow}
          </p>
          <p className="mt-1.5 text-sm leading-snug text-foreground">
            {base.focus}
          </p>
        </div>
      </div>
      {(priorities.length > 0 || actions.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {priorities.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Priorities For This Role
              </p>
              <ul className="mt-1.5 space-y-1">
                {priorities.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm leading-snug text-foreground">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {actions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available Actions
              </p>
              <ul className="mt-1.5 space-y-1">
                {actions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm leading-snug text-foreground">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Contributions saved as:</span>{" "}
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
          {contribution}
        </span>{" "}
        · one shared workspace record. Other roles' private notes stay hidden.
      </p>
    </section>
  );
}
