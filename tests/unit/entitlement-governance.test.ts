import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { labelForAuditEvent } from "@/lib/billing/governance.functions";

const SRC = readFileSync("src/lib/billing/governance.functions.ts", "utf8");
const PANEL = readFileSync("src/components/admin/GovernancePanel.tsx", "utf8");

describe("entitlement governance", () => {
  it("labels known audit events in Title Case", () => {
    expect(labelForAuditEvent("license_revoked")).toBe("License Revoked");
    expect(labelForAuditEvent("license_released_coverage_state")).toBe(
      "License Released — Coverage State",
    );
  });

  it("falls back to a readable label for unknown events", () => {
    expect(labelForAuditEvent("some_new_event")).toBe("Some New Event");
  });

  it("is read-only: no insert, update, or delete on the audit table", () => {
    expect(SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it("requires an authenticated caller", () => {
    expect(SRC).toContain("requireSupabaseAuth");
    expect(SRC).not.toContain("supabaseAdmin");
  });

  it("validates the organization id and clamps the window", () => {
    expect(SRC).toContain("UUID_RE.test(data.organizationId)");
    expect(SRC).toMatch(/Math\.min\(Math\.max\(data\.windowDays \?\? 180, 1\), 730\)/);
  });

  it("surfaces the written reason for every recorded change", () => {
    expect(PANEL).toContain("{row.reason}");
  });
});
