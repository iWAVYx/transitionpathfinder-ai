import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ROLES, type RoleKey } from "../e2e/helpers/roles";

const ROOT = path.resolve(__dirname, "../..");
const ROLE_ACCESS_SPEC = readFileSync(
  path.join(ROOT, "tests/e2e/role-access-rules.signedin.spec.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

const DISCOVERY_ROLES: RoleKey[] = ["student", "parent", "educator"];
const NON_MANAGEMENT_ROLES: RoleKey[] = [
  "student",
  "parent",
  "educator",
  "school_admin",
  "district_admin",
];

describe("Partner Network discovery and management boundaries", () => {
  it.each(DISCOVERY_ROLES)(
    "allows the %s dashboard to name the shared Partner Network directory",
    (roleKey) => {
      const role = ROLES.find(({ key }) => key === roleKey);
      expect(role).toBeDefined();
      expect(role?.mustNotSee.some(({ source }) => /partner network/i.test(source))).toBe(false);
    },
  );

  it.each(NON_MANAGEMENT_ROLES)("keeps /partners-manage forbidden for the %s role", (roleKey) => {
    expect(ROLE_ACCESS_SPEC).toMatch(new RegExp(`${roleKey}: \\[.*"/partners-manage".*\\]`));
  });

  it("continues to test that only Partner and Owner can open partner management", () => {
    expect(ROLE_ACCESS_SPEC).toContain(
      'const shouldSee = role.key === "partner" || role.key === "owner";',
    );
    expect(ROLE_ACCESS_SPEC).toContain('await page.goto("/partners-manage"');
  });
});
