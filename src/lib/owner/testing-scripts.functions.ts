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
  ...buildRoleQaScripts(),
];

/**
 * Final role-based QA — one script per role. Every script shares a 12-check
 * baseline (account, onboarding, landing, nav, NBAs, main tasks, sensitive
 * data, restricted pages, persistence, mobile, tablet, desktop) and adds the
 * role-specific journey checks from the operator brief.
 *
 * Steps already covered by automated suites (role-guard matrix, RLS tests,
 * mobile-responsive Playwright spec, persistence smoke) are pre-seeded as
 * passed via the companion migration so operators only manually verify the
 * remaining UX-level steps.
 */
type RoleQa = { key: string; label: string; description: string; extra: ScriptStep[] };

const BASELINE_STEPS: ScriptStep[] = [
  { key: "signup", title: "Create an account", detail: "Sign up cleanly with email/password from /login; receive confirmation if required." },
  { key: "onboarding", title: "Complete onboarding", detail: "Run /onboarding end-to-end; role is selected and saved without errors." },
  { key: "dashboard_landing", title: "Lands on correct dashboard", detail: "Post-onboarding redirect matches role (per fallbackPathFor in role-policy)." },
  { key: "nav_visibility", title: "Sees only correct navigation", detail: "Header nav reflects audiences in ROUTE_AUDIENCES; no cross-role links leak. Backed by tests/role-guard-matrix.test.mjs." },
  { key: "nba_cards", title: "Sees role-specific Next Best Action cards", detail: "Dashboard NBA cards match role and stage." },
  { key: "main_tasks", title: "Can perform main tasks for the role", detail: "Execute the role-specific tasks listed in this script without blocked errors." },
  { key: "sensitive_protected", title: "Sensitive student info is protected", detail: "Direct table access denied across student/district/document RLS. Backed by documents-rls, cross-district-rls, rls-pii-access, calendar-rls tests." },
  { key: "restricted_blocked", title: "Restricted pages are blocked", detail: "Deep-links to non-audience routes redirect to fallback. Backed by tests/role-guard-matrix.test.mjs." },
  { key: "persistence", title: "Data persists after refresh", detail: "Refresh on dashboard, student profile, and one work page — state restores. Backed by tests/persistence-smoke.test.mjs." },
  { key: "mobile", title: "Mobile view works", detail: "375x812 — header, nav drawer, primary CTAs reachable. Backed by tests/e2e/mobile-responsive.spec.ts." },
  { key: "tablet", title: "Tablet view works", detail: "768x1024 — layouts reflow, no horizontal scroll on primary pages." },
  { key: "desktop", title: "Desktop view works", detail: "1440x900 — full layout including secondary panels renders correctly." },
];

const ROLE_QA: RoleQa[] = [
  {
    key: "qa-student",
    label: "QA — Student",
    description: "Student account: voice, IEP summary, report sections, action items, prep.",
    extra: [
      { key: "view_iep_summary", title: "View student-facing IEP info", detail: "Open MyIepSummaryCard; plain-language summary shows without clinical text." },
      { key: "complete_voice", title: "Complete Student Voice", detail: "Submit at least one Student Voice response from /student-voice." },
      { key: "report_student_sections", title: "View Pathway Report student sections", detail: "Open /reports/$id; the student-facing audience block renders." },
      { key: "view_action_items", title: "View action items", detail: "Action items list shows tasks owned by or shared with the student." },
      { key: "view_meeting_prep", title: "View meeting prep", detail: "Upcoming meeting prep is visible from the student dashboard." },
    ],
  },
  {
    key: "qa-parent",
    label: "QA — Parent / Guardian",
    description: "Family account: create student, upload IEP, review, save resources, plan ahead.",
    extra: [
      { key: "create_student", title: "Create a student", detail: "Add a new student from /students; record persists with owner_id = self." },
      { key: "upload_iep", title: "Upload IEP", detail: "Upload a PDF via FamilyDocumentUpload; signed URL works and access is scoped." },
      { key: "review_extracted", title: "Review extracted info", detail: "Open the document; AI summary/extraction renders within policy." },
      { key: "view_report", title: "View Pathway Report", detail: "Generate or open a Pathway Report and see family-facing sections." },
      { key: "save_resources", title: "Save resources", detail: "Save a resource and see it on the student profile." },
      { key: "add_meeting_prep", title: "Add meeting prep", detail: "Create a meeting and add a prep item / agenda question." },
      { key: "add_calendar_event", title: "Add calendar event", detail: "Add an event from /calendar; appears on dashboard calendar." },
    ],
  },
  {
    key: "qa-educator",
    label: "QA — Educator / Case Manager",
    description: "Educator account: caseload, IEP review, notes, action items, recommendations, prep.",
    extra: [
      { key: "view_caseload", title: "View assigned students", detail: "/caseload lists only students where this user is owner or accepted collaborator." },
      { key: "review_iep", title: "Review IEP info", detail: "Open a student document; signed URL works; notes editable per role." },
      { key: "add_case_notes", title: "Add case manager notes", detail: "Add a collaboration note; saves and is visible to the team." },
      { key: "create_action_item", title: "Create an action item", detail: "Create a student-level action item from the profile or PPT prep agenda." },
      { key: "recommend_resources", title: "Recommend resources", detail: "Push a recommended resource into the student plan via the recommendations panel." },
      { key: "update_meeting_prep", title: "Update meeting prep", detail: "Edit prep items / partner suggestions on an upcoming meeting." },
    ],
  },
  {
    key: "qa-school-admin",
    label: "QA — School Administrator",
    description: "School admin: overview, report completion, staff progress.",
    extra: [
      { key: "school_overview", title: "View school-level progress", detail: "/school/overview renders metrics scoped to this school." },
      { key: "report_completion", title: "Check report completion", detail: "/school/reports shows pathway report counts and statuses." },
      { key: "staff_progress", title: "Check staff/case manager progress", detail: "/school/team and /school/implementation reflect staff activity." },
    ],
  },
  {
    key: "qa-district-admin",
    label: "QA — School District Administrator",
    description: "District admin: rollup, school-by-school, aggregate trends.",
    extra: [
      { key: "district_overview", title: "View district-level progress", detail: "/district/overview renders district-scoped rollup." },
      { key: "school_by_school", title: "View school-by-school implementation", detail: "/district/schools lists every school with implementation status." },
      { key: "aggregate_trends", title: "View aggregate transition trends", detail: "/district/reports shows aggregate metrics; cross-district isolation enforced (cross-district-rls test)." },
    ],
  },
  {
    key: "qa-partner",
    label: "QA — Partner Organization",
    description: "Partner: profile, opportunities, deadlines, privacy of student data.",
    extra: [
      { key: "complete_profile", title: "Complete partner profile", detail: "Fill out partner organization profile from /partners-manage." },
      { key: "submit_opportunity", title: "Submit an opportunity", detail: "Create a partner_opportunity; appears in the partner-managed list." },
      { key: "update_deadline", title: "Update an opportunity deadline", detail: "Edit application/decision dates and verify persistence." },
      { key: "no_student_docs", title: "Confirm no access to private student documents", detail: "Attempts to read students / documents / iep extractions are denied (documents-rls, rls-pii-access)." },
    ],
  },
  {
    key: "qa-platform-admin",
    label: "QA — Platform Admin",
    description: "Platform admin: waitlist, users, approvals, feedback, compliance, health.",
    extra: [
      { key: "view_waitlist", title: "View waitlist", detail: "/owner/waitlist lists submissions; admin notes editable." },
      { key: "manage_users", title: "Manage users", detail: "/owner/users lets admin assign/revoke roles; no privilege escalation on user_roles." },
      { key: "approve_partners_resources", title: "Approve partners/resources", detail: "Verification status for partners and review status for resources can be set to verified." },
      { key: "view_feedback_bugs", title: "View feedback / bugs", detail: "/owner/feedback and product issues list current items." },
      { key: "compliance_checklist", title: "Compliance & Trust checklist current", detail: "/owner/compliance shows all items; statuses reflect reality." },
      { key: "system_health", title: "System health green", detail: "/owner/system-health probes pass; manual flow checks current." },
    ],
  },
];

function buildRoleQaScripts(): ScriptDef[] {
  return ROLE_QA.map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description,
    steps: [...BASELINE_STEPS, ...r.extra],
  }));
}

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
  .validator((i: unknown) =>
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

    const patch: {
      script_key: string;
      step_key: string;
      run_by: string;
      completed?: boolean;
      passed?: boolean | null;
      issue_found?: string | null;
      notes?: string | null;
      priority?: Priority;
      assigned_follow_up?: string | null;
    } = {
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
  .validator((i: unknown) =>
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
