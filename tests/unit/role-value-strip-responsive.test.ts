import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

const ROLE_VALUE_STRIP = read("src/components/value/RoleValueStrip.tsx");
const STUDENT_DASHBOARD = read("src/components/dashboard/StudentDashboard.tsx");
const EDUCATOR_DASHBOARD = read("src/routes/_authenticated/caseload.tsx");

describe("RoleValueStrip responsive layout", () => {
  it("stacks the explanation and next action at mobile widths", () => {
    expect(ROLE_VALUE_STRIP).toContain('className="min-w-0 basis-full sm:basis-auto sm:flex-1"');
    expect(ROLE_VALUE_STRIP).toContain('className="flex w-full items-center gap-1.5 rounded-full');
    expect(ROLE_VALUE_STRIP).toContain("sm:w-auto");
  });

  it("keeps the shared fix connected to the Student and Educator dashboards", () => {
    expect(STUDENT_DASHBOARD).toContain('<RoleValueStrip role="student"');
    expect(EDUCATOR_DASHBOARD).toContain('<RoleValueStrip role="educator"');
  });
});
