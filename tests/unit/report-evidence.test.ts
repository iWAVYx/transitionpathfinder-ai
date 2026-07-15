import { describe, expect, it } from "vitest";
import {
  REPORT_SECTIONS,
  evidenceCoveragePct,
  groupEvidenceBySection,
  type EvidenceLink,
} from "../../src/lib/report-evidence/types";

function mk(section: EvidenceLink["reportSection"], id = section): EvidenceLink {
  return {
    id,
    studentId: "s1",
    reportSection: section,
    sourceKind: "document",
    sourceLabel: "x",
    createdAt: "2025-01-01T00:00:00Z",
  };
}

describe("report-evidence utilities", () => {
  it("groupEvidenceBySection puts each link under its section", () => {
    const g = groupEvidenceBySection([mk("snapshot"), mk("readiness"), mk("readiness", "b")]);
    expect(g.snapshot).toHaveLength(1);
    expect(g.readiness).toHaveLength(2);
    expect(g.partner_matches).toHaveLength(0);
  });

  it("groupEvidenceBySection returns keys for every canonical section", () => {
    const g = groupEvidenceBySection([]);
    for (const s of REPORT_SECTIONS) {
      expect(g[s]).toEqual([]);
    }
  });

  it("evidenceCoveragePct measures distinct sections covered", () => {
    expect(evidenceCoveragePct([])).toBe(0);
    expect(evidenceCoveragePct([mk("snapshot"), mk("snapshot", "b")])).toBe(
      Math.round((1 / REPORT_SECTIONS.length) * 100),
    );
    const all = REPORT_SECTIONS.map((s) => mk(s));
    expect(evidenceCoveragePct(all)).toBe(100);
  });
});
