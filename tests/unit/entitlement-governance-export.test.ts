import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  AUDIT_CSV_HEADERS,
  auditCsvFilename,
  csvCell,
  toAuditCsv,
} from "@/lib/billing/governance-export";
import { labelForAuditEvent } from "@/lib/billing/governance.functions";

const PANEL = readFileSync("src/components/admin/GovernancePanel.tsx", "utf8");

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  event: "license_revoked",
  reason: 'Student "graduated", seat returned',
  license_type: "student_pathway",
  organization_id: "22222222-2222-4222-8222-222222222222",
  subject_user_id: null,
  allocation_id: null,
  pool_id: null,
  actor_id: null,
  created_at: "2026-07-31T12:00:00.000Z",
};

describe("entitlement audit CSV export", () => {
  it("writes a header row followed by one line per record", () => {
    const csv = toAuditCsv([row], labelForAuditEvent);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(AUDIT_CSV_HEADERS.join(","));
    expect(lines[1]).toContain('"License Revoked"');
  });

  it("escapes embedded quotes so reasons survive intact", () => {
    const csv = toAuditCsv([row], labelForAuditEvent);
    expect(csv).toContain('"Student ""graduated"", seat returned"');
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell("=cmd|calc")).toBe(`"'=cmd|calc"`);
    expect(csvCell(null)).toBe('""');
  });

  it("names the file by organization and window", () => {
    expect(auditCsvFilename(row.organization_id, 90)).toMatch(
      /^entitlement-audit_22222222_90d_\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  it("exports only what the panel is currently showing", () => {
    expect(PANEL).toContain("toAuditCsv(visibleEvents");
  });

  it("stays read-only: export adds no write path", () => {
    const SRC = readFileSync("src/lib/billing/governance-export.ts", "utf8");
    expect(SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|supabase/);
  });
});
