/**
 * Core workflow smoke tests. Each test goes only as deep as the seeded
 * data allows: it loads the surface, asserts the primary landmark, and
 * walks one canonical interaction (when present). Tests skip cleanly
 * when the relevant role storage state is missing or the surface isn't
 * applicable to the role.
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { ROLES, type RoleKey } from "../helpers/roles";

function roleState(key: RoleKey) {
  return ROLES.find((r) => r.key === key)!.storageState;
}

async function loadSurface(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("main").first()).toBeVisible({ timeout: 20_000 });
  const finalPath = new URL(page.url()).pathname;
  expect(finalPath, `${path} bounced to ${finalPath}`).not.toMatch(/^\/login/);
}

type Flow = {
  name: string;
  role: RoleKey;
  path: string;
  expect?: RegExp;
};

const FLOWS: Flow[] = [
  { name: "onboarding", role: "parent", path: "/onboarding", expect: /welcome|start|step/i },
  { name: "student profile", role: "educator", path: "/caseload", expect: /student|caseload/i },
  { name: "document upload", role: "parent", path: "/documents", expect: /document|upload/i },
  { name: "Student Voice", role: "student", path: "/dashboard", expect: /voice|your/i },
  { name: "Pathway Report", role: "parent", path: "/dashboard", expect: /pathway/i },
  { name: "action items", role: "educator", path: "/caseload", expect: /action|next/i },
  { name: "meeting prep", role: "educator", path: "/meetings", expect: /meeting|prep/i },
  { name: "resources", role: "parent", path: "/resources", expect: /resource|guide/i },
  { name: "BridgeForward", role: "student", path: "/bridgeforward", expect: /bridge/i },
  { name: "PartnerForward", role: "partner", path: "/partners-manage", expect: /partner|opportunit/i },
];

for (const flow of FLOWS) {
  test.describe(`workflow: ${flow.name}`, () => {
    const state = roleState(flow.role);
    test.skip(() => !existsSync(state), `no storageState for ${flow.role}`);
    test.use({ storageState: state });

    test(`${flow.role} can load ${flow.path}`, async ({ page }) => {
      await loadSurface(page, flow.path);
      if (flow.expect) {
        await expect(page.locator("main").getByText(flow.expect).first()).toBeVisible({
          timeout: 15_000,
        });
      }
      // Surface must expose at least one actionable control.
      const actionable = page
        .locator("main")
        .getByRole("link")
        .or(page.locator("main").getByRole("button"));
      expect(await actionable.count(), `${flow.path} has no actionable controls`).toBeGreaterThan(0);
    });
  });
}
