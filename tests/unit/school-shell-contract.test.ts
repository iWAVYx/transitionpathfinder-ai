// Regression: /school/overview must render its role dashboard testid on a
// real <main> landmark via the shared SiteShell — the same code path used
// by every other passing role. Guards against a future refactor that
// re-attaches the testid to a <div>, a hidden sentinel, a display:contents
// wrapper, or a duplicate off-screen main.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const shellSrc = readFileSync(
  resolve(__dirname, "../../src/components/school/SchoolPageShell.tsx"),
  "utf8",
);
const siteShellSrc = readFileSync(
  resolve(__dirname, "../../src/components/site/SiteShell.tsx"),
  "utf8",
);

describe("SchoolPageShell semantic main contract", () => {
  it("delegates its <main> landmark to SiteShell with the school_admin dashboardTestId", () => {
    expect(shellSrc).toMatch(
      /<SiteShell\s+dashboardTestId=\{ROLE_DASHBOARD_TEST_IDS\.school_admin\}>/,
    );
  });

  it("does not open a second <main> element inside the shell", () => {
    const opens = shellSrc.match(/<main\b/g) ?? [];
    expect(opens.length).toBe(0);
  });

  it("SiteShell renders exactly one <main> carrying data-testid", () => {
    const opens = siteShellSrc.match(/<main\b/g) ?? [];
    expect(opens.length).toBe(1);
    expect(siteShellSrc).toMatch(/data-testid=\{testId \?\? undefined\}/);
  });
});
