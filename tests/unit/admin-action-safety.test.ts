import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const schoolFunctions = source("src/lib/school-admin.functions.ts");
const schoolTeam = source("src/routes/_authenticated/school.team.tsx");
const ownerFunctions = source("src/lib/owner/owner.functions.ts");

describe("administrator action safety", () => {
  it("prevents a school from losing its final active administrator", () => {
    expect(schoolFunctions).toContain(
      "Cannot remove or demote the last active school administrator",
    );
    expect(schoolFunctions).toContain("targetRemainsActiveAdmin");
    expect(schoolFunctions).toContain("school.membership_updated");
  });

  it("confirms school team removals and role changes before applying them", () => {
    expect(schoolTeam).toContain("Confirm Team Access Change");
    expect(schoolTeam).toContain("Keep Current Access");
    expect(schoolTeam).not.toContain('confirm("Remove this teammate?")');
  });

  it("protects the final platform owner regardless of the initiating user", () => {
    expect(ownerFunctions).toContain('if (data.role === "platform_owner")');
    expect(ownerFunctions).not.toContain(
      'if (data.user_id === userId && data.role === "platform_owner")',
    );
    expect(ownerFunctions).toContain("Cannot remove the last platform owner.");
  });
});
