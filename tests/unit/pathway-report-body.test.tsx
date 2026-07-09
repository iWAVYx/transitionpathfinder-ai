/**
 * Guardrails for PathwayReportBody — the stage-grouped orchestrator
 * that lays out report sections under the nine workspace stages.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PathwayReportBody, reportStageAnchorId } from "../../src/components/pathway/report/PathwayReportBody";
import { WORKSPACE_STAGES } from "../../src/lib/workspace/stages";

function stageOrder(html: string): string[] {
  const out: string[] = [];
  const re = /data-report-stage="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function sectionOrder(html: string): string[] {
  const out: string[] = [];
  const re = /data-report-section="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

describe("PathwayReportBody", () => {
  it("renders stage headers in canonical journey order for present sections", () => {
    const html = renderToStaticMarkup(
      <PathwayReportBody
        sections={{
          student_snapshot: <div>snap</div>,
          student_voice: <div>voice</div>,
          readiness_scorecard: <div>ready</div>,
          recommended_pathways: <div>pathways</div>,
          next_steps_30_90_180_365: <div>next</div>,
          recommended_resources: <div>res</div>,
        }}
      />
    );
    expect(stageOrder(html)).toEqual(["start", "voice", "ready", "roadmap", "action", "connect"]);
  });

  it("skips stages when none of their sections are provided", () => {
    const html = renderToStaticMarkup(
      <PathwayReportBody sections={{ student_snapshot: <div>snap</div> }} />
    );
    expect(stageOrder(html)).toEqual(["start"]);
  });

  it("skips sections whose node is null/false so TOC and body agree", () => {
    const html = renderToStaticMarkup(
      <PathwayReportBody
        sections={{
          student_snapshot: null,
          strengths_preferences_interests_needs: <div>spin</div>,
        }}
      />
    );
    expect(sectionOrder(html)).toEqual(["strengths_preferences_interests_needs"]);
  });

  it("renders the appendix slot under an explicit Appendix heading", () => {
    const html = renderToStaticMarkup(
      <PathwayReportBody
        sections={{ student_snapshot: <div>snap</div> }}
        appendix={<div>timeline-node</div>}
      />
    );
    expect(html).toContain("timeline-node");
    expect(html).toContain('id="report-appendix"');
    expect(html).toContain("Appendix");
  });

  it("exposes a stable anchor id per stage", () => {
    for (const stage of WORKSPACE_STAGES) {
      expect(reportStageAnchorId(stage.id)).toBe(`stage-${stage.id}`);
    }
  });
});
