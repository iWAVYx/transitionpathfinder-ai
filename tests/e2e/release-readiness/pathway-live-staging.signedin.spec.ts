import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";

import type { Database, Json } from "../../../src/integrations/supabase/types";
import { ROLES, type RoleSpec } from "../helpers/roles";

const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph";
const STAGING_AI_APP_HOST = "gentle-forward-reach.lovable.app";
const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";
const QA_NAME_PREFIX = "QA Pathway";
const QA_COLLABORATOR_PREFIX = "pathway.qa.";

const family = ROLES.find((role) => role.key === "parent")!;
const student = ROLES.find((role) => role.key === "student")!;
const educator = ROLES.find((role) => role.key === "educator")!;
const partner = ROLES.find((role) => role.key === "partner")!;
const acceptanceRoles = [family, student, educator, partner];

test.describe.configure({ mode: "serial" });
test.skip(
  process.env.RUN_PATHWAY_LIVE_STAGING_QA !== "true",
  "manual protected-staging Pathway acceptance was not explicitly enabled",
);
test.skip(
  process.env.RUN_PATHWAY_LIVE_STAGING_QA === "true" &&
    acceptanceRoles.some((role) => !existsSync(role.storageState)),
  "one or more protected synthetic staging role sessions are missing",
);

let admin: SupabaseClient<Database>;
let parentId = "";
let studentUserId = "";
let educatorId = "";
let syntheticStudentId = "";
let collaboratorId = "";
let intakeId = "";
let reportId = "";

const rawRunId = process.env.PATHWAY_QA_RUN_ID?.trim() || "local-protected-run";
const runId = rawRunId.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 36);
const qaName = `${QA_NAME_PREFIX} ${runId}`;
const qaMarker = `Synthetic staging Pathway acceptance ${runId}`;
const qaCollaboratorEmail = `${QA_COLLABORATOR_PREFIX}${runId.toLowerCase()}@staging.transitionforwardct.test`;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for protected Pathway staging acceptance`);
  return value;
}

async function profileId(email: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error || !data) throw new Error(`Synthetic staging profile is missing for ${email}`);
  return data.id;
}

async function deleteQaRows() {
  if (!admin || !parentId) return;

  const { data: intakes, error: intakeReadError } = await admin
    .from("student_intakes")
    .select("id")
    .eq("user_id", parentId)
    .like("student_first_name", `${QA_NAME_PREFIX} %`);
  if (intakeReadError)
    throw new Error(`Could not list Pathway QA intakes: ${intakeReadError.message}`);

  const intakeIds = (intakes ?? []).map((row) => row.id);
  if (intakeIds.length > 0) {
    const { error: reportDeleteError } = await admin
      .from("pathway_reports")
      .delete()
      .in("intake_id", intakeIds);
    if (reportDeleteError)
      throw new Error(`Could not remove Pathway QA reports: ${reportDeleteError.message}`);

    const { error: intakeDeleteError } = await admin
      .from("student_intakes")
      .delete()
      .in("id", intakeIds);
    if (intakeDeleteError)
      throw new Error(`Could not remove Pathway QA intakes: ${intakeDeleteError.message}`);
  }

  if (syntheticStudentId && educatorId) {
    const { error: collaboratorDeleteError } = await admin
      .from("student_collaborators")
      .delete()
      .eq("student_id", syntheticStudentId)
      .eq("user_id", educatorId)
      .like("invited_email", `${QA_COLLABORATOR_PREFIX}%@staging.transitionforwardct.test`);
    if (collaboratorDeleteError) {
      throw new Error(
        `Could not remove the temporary Pathway QA collaborator: ${collaboratorDeleteError.message}`,
      );
    }
  }
}

async function rolePage(browser: Browser, role: RoleSpec) {
  const baseURL = requiredEnv("PLAYWRIGHT_BASE_URL");
  const context = await browser.newContext({
    baseURL,
    storageState: role.storageState,
  });
  const page = await context.newPage();
  return { context, page };
}

async function closeContext(context: BrowserContext) {
  await context.close().catch(() => {});
}

function expectStagingPage(page: Page) {
  expect(new URL(page.url()).hostname).toBe(STAGING_AI_APP_HOST);
}

async function expectStep(page: Page, step: string) {
  await expect(page.getByTestId("pathway-intake-form")).toHaveAttribute("data-pathway-step", step, {
    timeout: 20_000,
  });
}

async function fillNamed(page: Page, name: string, value: string) {
  await page.locator(`[name="${name}"]`).fill(value);
}

async function continueTo(page: Page, nextStep: string) {
  await page.getByTestId("pathway-continue").click();
  await expectStep(page, nextStep);
}

function contentSummary(content: Json): string | null {
  if (!content || Array.isArray(content) || typeof content !== "object") return null;
  return typeof content.summary === "string" ? content.summary : null;
}

test.beforeAll(async () => {
  const supabaseUrl = requiredEnv("STAGING_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("STAGING_SUPABASE_SERVICE_ROLE_KEY");
  const supabaseHost = new URL(supabaseUrl).hostname;
  const appHost = new URL(requiredEnv("PLAYWRIGHT_BASE_URL")).hostname;

  if (supabaseHost !== `${STAGING_PROJECT_REF}.supabase.co`) {
    throw new Error(`Refusing non-staging Supabase target: ${supabaseHost}`);
  }
  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("Refusing the production Supabase project");
  }
  if (appHost !== STAGING_AI_APP_HOST) {
    throw new Error(`Refusing non-Lovable staging AI target: ${appHost}`);
  }

  admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  [parentId, studentUserId, educatorId] = await Promise.all([
    profileId("e2e.parent@staging.transitionforwardct.test"),
    profileId("e2e.student@staging.transitionforwardct.test"),
    profileId("e2e.educator@staging.transitionforwardct.test"),
  ]);

  const { data: syntheticStudent, error: studentError } = await admin
    .from("students")
    .select("id")
    .eq("owner_id", parentId)
    .eq("student_user_id", studentUserId)
    .eq("first_name", "Robin")
    .eq("last_name", "Staging")
    .single();
  if (studentError || !syntheticStudent) {
    throw new Error("The protected Robin Staging synthetic student fixture is missing");
  }
  syntheticStudentId = syntheticStudent.id;

  await deleteQaRows();

  const { data: collaborator, error: collaboratorError } = await admin
    .from("student_collaborators")
    .insert({
      student_id: syntheticStudentId,
      user_id: educatorId,
      invited_email: qaCollaboratorEmail,
      invited_by: parentId,
      role: "editor",
      status: "accepted",
      is_demo: true,
    })
    .select("id")
    .single();
  if (collaboratorError || !collaborator) {
    throw new Error(
      `Could not create the temporary synthetic educator relationship: ${collaboratorError?.message ?? "row missing"}`,
    );
  }
  collaboratorId = collaborator.id;
});

test.afterAll(async () => {
  await deleteQaRows();
});

test("Family creates one linked report from the complete live Pathway intake", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const { context, page } = await rolePage(browser, family);
  try {
    await page.goto("/pathway", { waitUntil: "domcontentloaded" });
    expectStagingPage(page);
    await expectStep(page, "role");
    await page.getByTestId("pathway-role-family").click();
    await continueTo(page, "about");

    await expect(page.locator('[name="student_id"]')).toHaveValue(syntheticStudentId, {
      timeout: 20_000,
    });
    await expect(page.locator('[name="student_first_name"]')).not.toHaveValue("");
    await fillNamed(page, "student_first_name", qaName);
    await continueTo(page, "strengths");

    await fillNamed(page, "strengths", `${qaMarker}: careful problem solving`);
    await fillNamed(page, "interests", `${qaMarker}: culinary arts and robotics`);
    await continueTo(page, "career");

    await fillNamed(page, "career_goals", `${qaMarker}: explore a paid culinary internship`);
    await fillNamed(page, "education_goals", `${qaMarker}: compare certificate programs`);
    await continueTo(page, "life");

    await fillNamed(page, "needs", `${qaMarker}: written steps for unfamiliar routines`);
    await fillNamed(page, "life_skills", `${qaMarker}: practice weekly budgeting`);
    await fillNamed(page, "supports", `${qaMarker}: visual schedule and job coach`);
    await fillNamed(page, "learning_preferences", `${qaMarker}: preview choices before deciding`);
    await fillNamed(page, "assistive_technology", `${qaMarker}: speech-to-text`);
    await fillNamed(page, "accommodations", `${qaMarker}: written directions`);
    await continueTo(page, "context");

    await fillNamed(page, "services_received", `${qaMarker}: synthetic school support`);
    await fillNamed(page, "communication_prefs", `${qaMarker}: plain language in writing`);
    await fillNamed(page, "transportation_needs", `${qaMarker}: practice the bus route`);
    await fillNamed(page, "desired_postsecondary_outcomes", `${qaMarker}: paid part-time work`);
    await fillNamed(page, "family_priorities", `${qaMarker}: safety and self-advocacy`);
    await fillNamed(page, "student_worries", `${qaMarker}: asking for help at work`);
    await fillNamed(page, "family_concerns_extended", `${qaMarker}: service handoff timing`);
    await fillNamed(page, "upcoming_meetings", `${qaMarker}: synthetic review next month`);
    await fillNamed(page, "information_to_verify", `${qaMarker}: confirm travel-training contact`);
    await continueTo(page, "current");

    await fillNamed(page, "current_goals", `${qaMarker}: complete four job steps`);
    await fillNamed(page, "teacher_observations", `${qaMarker}: follows a visual checklist`);
    await fillNamed(page, "readiness_evidence", `${qaMarker}: four steps with one prompt`);
    await fillNamed(page, "evidence_source_dates", `${qaMarker}: synthetic job-coach log`);
    await fillNamed(page, "family_concerns", `${qaMarker}: preserve meaningful student choice`);
    await continueTo(page, "voices");

    await fillNamed(page, "student_voice", `${qaMarker}: I want to learn at a real job site`);
    await fillNamed(page, "family_voice", `${qaMarker}: build safe community independence`);
    await fillNamed(page, "educator_input", `${qaMarker}: continue work-based learning`);

    await page.getByTestId("pathway-generate").click();
    await page.waitForURL(/\/reports\/[0-9a-f-]+/i, { timeout: 240_000 });
    expectStagingPage(page);
    await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30_000 });
    reportId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1) ?? "";
    expect(reportId).toMatch(/^[0-9a-f-]{36}$/i);

    const { data: intake, error: intakeError } = await admin
      .from("student_intakes")
      .select(
        "id, user_id, student_id, submitter_role, supports, educator_input, family_concerns_extended",
      )
      .eq("user_id", parentId)
      .eq("student_first_name", qaName)
      .single();
    if (intakeError || !intake) throw new Error("The Family Pathway intake was not persisted");
    intakeId = intake.id;
    expect(intake.student_id).toBe(syntheticStudentId);
    expect(intake.submitter_role).toBe("family");
    expect(intake.supports).toContain(`Assistive technology: ${qaMarker}: speech-to-text`);
    expect(intake.supports).toContain(`Accommodations: ${qaMarker}: written directions`);
    expect(intake.educator_input).toContain(`Readiness evidence: ${qaMarker}`);
    expect(intake.family_concerns_extended).toContain(`Information to verify: ${qaMarker}`);

    const { data: report, error: reportError } = await admin
      .from("pathway_reports")
      .select("id, user_id, intake_id, student_id, model, content")
      .eq("id", reportId)
      .single();
    if (reportError || !report) throw new Error("The Family Pathway report was not persisted");
    expect(report.user_id).toBe(parentId);
    expect(report.intake_id).toBe(intakeId);
    expect(report.student_id).toBe(syntheticStudentId);
    expect(report.model).toBe("google/gemini-2.5-pro");
    expect(contentSummary(report.content)?.trim().length ?? 0).toBeGreaterThan(20);

    await page.goto("/pathway/family", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("family-pathway-page")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`a[href="/reports/${reportId}"]`).first()).toBeVisible();
  } finally {
    await closeContext(context);
  }
});

test("Student sees the linked report in the live student Pathway view", async ({ browser }) => {
  expect(reportId).not.toBe("");
  const { context, page } = await rolePage(browser, student);
  try {
    await page.goto("/pathway/student", { waitUntil: "domcontentloaded" });
    expectStagingPage(page);
    await expect(page.getByTestId("student-pathway-page")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`a[href="/reports/${reportId}"]`).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/reports/${reportId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30_000 });
    expectStagingPage(page);
  } finally {
    await closeContext(context);
  }
});

test("Educator can open the authorized student intake and linked report", async ({ browser }) => {
  expect(collaboratorId).not.toBe("");
  expect(reportId).not.toBe("");
  const { context, page } = await rolePage(browser, educator);
  try {
    await page.goto("/pathway", { waitUntil: "domcontentloaded" });
    expectStagingPage(page);
    await expectStep(page, "role");
    await page.getByTestId("pathway-role-educator").click();
    await continueTo(page, "about");
    await expect(page.locator('[name="student_id"]')).toHaveValue(syntheticStudentId, {
      timeout: 20_000,
    });
    await expect(page.locator('[name="student_first_name"]')).toHaveValue(/Robin/i);

    await page.goto(`/reports/${reportId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("pathway-report-page")).toBeVisible({ timeout: 30_000 });
    expectStagingPage(page);
  } finally {
    await closeContext(context);
  }
});

test("Partner is denied both the Pathway builder and the private report", async ({ browser }) => {
  expect(reportId).not.toBe("");
  const { context, page } = await rolePage(browser, partner);
  try {
    await page.goto("/pathway", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/partners-manage\/?$/, { timeout: 20_000 });
    expectStagingPage(page);
    await expect(page.getByTestId("pathway-intake-form")).toHaveCount(0);

    await page.goto(`/reports/${reportId}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/partners-manage\/?$/, { timeout: 20_000 });
    expectStagingPage(page);
    await expect(page.getByTestId("pathway-report-page")).toHaveCount(0);

    const { data: report, error } = await admin
      .from("pathway_reports")
      .select("id")
      .eq("id", reportId)
      .single();
    if (error || !report) throw new Error("Partner denial unexpectedly changed the QA report");
  } finally {
    await closeContext(context);
  }
});
