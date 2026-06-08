import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Operator-facing testing scripts. Step definitions live in code (single source
 * of truth); per-step outcomes persist in public.testing_script_runs keyed by
 * (script_key, step_key). Only platform admins / app admins can read or write
 * the rows (RLS).
 */

export type ScriptStep = {
  key: string;
  title: string;
  detail: string;
};

export type ScriptDef = {
  key: string;
  label: string;
  description: string;
  steps: ScriptStep[];
};

export const TEST_SCRIPTS: ScriptDef[] = [
  {
    key: "family-first-run",
    label: "Family — First Run",
    description:
      "A new family signs in, runs the intake, saves a report, and pushes recommendations into their plan.",
    steps: [
      { key: "signin", title: "Sign in with a Family demo account", detail: "Use /owner/demo to grab the family account credentials, then sign in cleanly." },
      { key: "onboarding", title: "Complete onboarding", detail: "Confirm role, primary student details, and consent prompts render without errors." },
      { key: "intake", title: "Run the Pathway intake", detail: "Submit the family intake form end-to-end; verify AI report appears within 30s." },
      { key: "save-report", title: "Save report to a student profile", detail: "Confirm the report saves and a student profile exists in the dashboard." },
      { key: "connect-actions", title: "Push items into Actions & Calendar", detail: "Use 'Connect to your plan' to add at least one item to Action Items and one to Calendar; verify both appear." },
      { key: "share", title: "Generate a share link", detail: "Create a share token, open in incognito, verify read-only report renders." },
    ],
  },
  {
    key: "educator-caseload",
    label: "Educator — Caseload Walkthrough",
    description: "Case manager reviews caseload, opens a student, reviews report, and schedules a PPT prep.",
    steps: [
      { key: "signin", title: "Sign in with an Educator demo account", detail: "Land on the caseload dashboard with the demo student visible." },
      { key: "open-student", title: "Open the demo student", detail: "Navigate to the student profile; confirm goals, action items, and report load." },
      { key: "schedule-ppt", title: "Schedule a PPT meeting", detail: "Create a meeting from /meetings; verify it appears on Calendar." },
      { key: "prep", title: "Generate meeting prep", detail: "Open the PPT prep view and confirm partner suggestions and agenda load." },
      { key: "share-family", title: "Share with family", detail: "Issue a family share token and verify the audience-correct view renders." },
    ],
  },
  {
    key: "school-admin",
    label: "School Admin — Implementation View",
    description: "School admin reviews caseload health, implementation status, and team activity.",
    steps: [
      { key: "signin", title: "Sign in with a School Admin demo account", detail: "Land on /school/overview." },
      { key: "overview", title: "Verify overview metrics", detail: "Counts for students, reports, action items render without errors." },
      { key: "implementation", title: "Open implementation view", detail: "Confirm /school/implementation lists pathway reports with status filters." },
      { key: "team", title: "Open team activity", detail: "Confirm recent activity loads and links resolve." },
    ],
  },
  {
    key: "district-admin",
    label: "District Admin — Multi-school Rollup",
    description: "District admin reviews schools, reports, and team rollups across the district.",
    steps: [
      { key: "signin", title: "Sign in with a District Admin demo account", detail: "Land on /district/overview." },
      { key: "schools", title: "Open schools list", detail: "Verify /district/schools enumerates schools and counts." },
      { key: "reports", title: "Open district reports", detail: "Confirm /district/reports renders aggregate metrics." },
      { key: "team", title: "Open team management", detail: "Confirm /district/team lists members and invitations." },
    ],
  },
  {
    key: "partner",
    label: "Partner — Opportunity Posting",
    description: "Partner organization posts an opportunity and confirms visibility.",
    steps: [
      { key: "signin", title: "Sign in with a Partner demo account", detail: "Land on /partners-manage." },
      { key: "create-opportunity", title: "Create a partner opportunity", detail: "Submit at least one new opportunity; verify it appears in the list." },
      { key: "edit", title: "Edit an opportunity", detail: "Update title or eligibility and verify the change persists." },
      { key: "visible-student", title: "Verify student visibility", detail: "Sign in as a student/family and confirm the opportunity is matchable." },
    ],
  },
  {
    key: "owner-admin",
    label: "Platform Admin — Operational Sweep",
    description: "Platform owner sweeps health, demo, broadcasts, and waitlist.",
    steps: [
      { key: "health", title: "System Health passes", detail: "All automated probes green; manual checklist current." },
      { key: "demo", title: "Demo accounts seeded", detail: "All 6 demo accounts present; reset works without errors." },
      { key: "broadcasts", title: "Broadcasts list loads", detail: "/owner/broadcasts opens; can compose a draft." },
      { key: "waitlist", title: "Waitlist intake works", detail: "Public waitlist form submits; admin sees the entry." },
      { key: "emails", title: "Email monitor green", detail: "/owner/emails shows recent sends without persistent failures." },
    ],
  },
];

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = (typeof PRIORITIES)[number];

export type StepRun = {
  script_key: string;
  step_key: string;
  completed: boolean;
  passed: boolean | null;
  issue_found: string | null;
  notes: string | null;
  priority: Priority;
  assigned_follow_up: string | null;
  run_by: string | null;
  updated_at: string | null;
};

export type ScriptWithRuns = ScriptDef & {
  runs: Record<string, StepRun>;
};

export const listTestingScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("testing_script_runs")
      .select(
        "script_key, step_key, completed, passed, issue_found, notes, priority, assigned_follow_up, run_by, updated_at",
      );
    if (error) throw new Error(error.message);

    const byScript = new Map<string, Map<string, StepRun>>();
    for (const r of (data ?? []) as StepRun[]) {
      let m = byScript.get(r.script_key);
      if (!m) {
        m = new Map();
        byScript.set(r.script_key, m);
      }
      m.set(r.step_key, r);
    }

    const scripts: ScriptWithRuns[] = TEST_SCRIPTS.map((def) => {
      const m = byScript.get(def.key);
      const runs: Record<string, StepRun> = {};
      if (m) for (const [k, v] of m) runs[k] = v;
      return { ...def, runs };
    });

    return { scripts };
  });

export const upsertTestingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        script_key: z.string().min(1).max(80),
        step_key: z.string().min(1).max(80),
        completed: z.boolean().optional(),
        passed: z.boolean().nullable().optional(),
        issue_found: z.string().max(2000).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        priority: z.enum(PRIORITIES).optional(),
        assigned_follow_up: z.string().max(200).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const valid =
      TEST_SCRIPTS.find((s) => s.key === data.script_key)?.steps.some(
        (st) => st.key === data.step_key,
      ) ?? false;
    if (!valid) throw new Error("Unknown script or step");

    const patch: Record<string, unknown> = {
      script_key: data.script_key,
      step_key: data.step_key,
      run_by: userId,
    };
    if (data.completed !== undefined) patch.completed = data.completed;
    if (data.passed !== undefined) patch.passed = data.passed;
    if (data.issue_found !== undefined) patch.issue_found = data.issue_found;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.assigned_follow_up !== undefined)
      patch.assigned_follow_up = data.assigned_follow_up;

    const { error } = await supabase
      .from("testing_script_runs")
      .upsert(patch, { onConflict: "script_key,step_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTestingScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ script_key: z.string().min(1).max(80) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("testing_script_runs")
      .delete()
      .eq("script_key", data.script_key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
