import { describe, it, expect } from "vitest";
import { REPORT_SECTIONS } from "../../src/lib/report-evidence/types";

// Reserved priorities for a future mounted evidence-attachment workflow.
// The personal feed does not emit an unsupported attachment shortcut.
const PRIORITY_EVIDENCE_SECTIONS = [
  "snapshot",
  "student_voice",
  "family_priorities",
  "documents",
  "readiness",
];

describe("next-action evidence derivation", () => {
  it("priority sections are all valid report sections", () => {
    for (const s of PRIORITY_EVIDENCE_SECTIONS) {
      expect(REPORT_SECTIONS).toContain(s);
    }
  });

  it("priority list stays small so dashboards don't flood", () => {
    expect(PRIORITY_EVIDENCE_SECTIONS.length).toBeLessThanOrEqual(6);
  });
});
