import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  exportWindowDaysLeft,
  labelForCoverageState,
} from "@/lib/billing/coverage.functions";

const SRC = readFileSync("src/lib/billing/coverage.functions.ts", "utf8");
const PANEL = readFileSync("src/components/admin/CoveragePanel.tsx", "utf8");

describe("student coverage continuity admin surface", () => {
  it("labels coverage states in Title Case", () => {
    expect(labelForCoverageState("graduated")).toBe("Graduated");
    expect(labelForCoverageState("some_new_state")).toBe("Some New State");
  });

  it("counts remaining export-window days, never negative", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(exportWindowDaysLeft("2026-08-11T00:00:00.000Z", now)).toBe(10);
    expect(exportWindowDaysLeft("2026-07-01T00:00:00.000Z", now)).toBe(0);
    expect(exportWindowDaysLeft(null, now)).toBeNull();
  });

  it("is read-only on the server: no write path to students", () => {
    expect(SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(SRC).not.toContain("supabaseAdmin");
  });

  it("requires an authenticated caller and validates the organization", () => {
    expect(SRC).toContain("requireSupabaseAuth");
    expect(SRC).toContain("UUID_RE.test(data.organizationId)");
  });

  it("routes every change through the audited coverage-state function", () => {
    expect(PANEL).toContain("setStudentCoverageState");
    expect(PANEL).toContain("reason.trim()");
  });

  it("blocks submission without a reason or a transfer target", () => {
    expect(PANEL).toContain("reason.trim().length < 10");
    expect(PANEL).toContain('nextState === "transferred" && !toOrg');
  });
});
