/**
 * Guardrails for PathwayReportSpine — the workspace-bound Report TOC.
 *
 * The spine MUST render every report section in stage order and MUST
 * produce anchor ids that match the shared stage model contract. The
 * next slice (per-section rewrite) relies on these anchor ids being
 * stable.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PathwayReportSpine,
  reportSectionAnchorId,
  REPORT_SECTION_ANCHOR_PREFIX,
} from "../../src/components/pathway/report/PathwayReportSpine";
import {
  reportSectionsInOrder,
  REPORT_SECTION_LABELS,
} from "../../src/lib/workspace/stages";

describe("PathwayReportSpine", () => {
  const html = renderToStaticMarkup(<PathwayReportSpine />);

  it("renders every report section in stage order", () => {
    const anchors = Array.from(
      html.matchAll(/href="#(section-[a-z0-9_]+)"/g),
      (m) => m[1],
    );
    const expected = reportSectionsInOrder().map(({ section }) =>
      reportSectionAnchorId(section),
    );
    expect(anchors).toEqual(expected);
  });

  it("uses the shared REPORT_SECTION_LABELS as link text", () => {
    for (const { section } of reportSectionsInOrder()) {
      expect(html).toContain(REPORT_SECTION_LABELS[section]);
    }
  });

  it("all anchor ids share the documented prefix", () => {
    for (const { section } of reportSectionsInOrder()) {
      expect(reportSectionAnchorId(section).startsWith(REPORT_SECTION_ANCHOR_PREFIX)).toBe(true);
    }
  });

  it("respects presentSections filter (only shows sections in the set)", () => {
    const only = new Set(["student_snapshot", "readiness_scorecard"] as const);
    const filtered = renderToStaticMarkup(
      <PathwayReportSpine presentSections={only} />,
    );
    expect(filtered).toContain(reportSectionAnchorId("student_snapshot"));
    expect(filtered).toContain(reportSectionAnchorId("readiness_scorecard"));
    expect(filtered).not.toContain(reportSectionAnchorId("meeting_prep_questions"));
  });
});
