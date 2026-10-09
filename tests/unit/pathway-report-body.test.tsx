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

  it("uses document wording without promising uploads, scores, fixed timeframes or missing appendix content", () => {
    const workspaceTitles = WORKSPACE_STAGES.map(stage => stage.title);
    const html = renderToStaticMarkup(<PathwayReportBody sections={{
      student_snapshot: <p>Recorded student details</p>,
      data_gaps: <p>Current information and open questions</p>,
      readiness_scorecard: <p>Recorded qualitative levels</p>,
      next_steps_30_90_180_365: <p>Next semester: recorded follow-up</p>,
    }} appendix={<p>Recorded review note only</p>} />);
    expect(html).toContain("About the Student");
    expect(html).toContain("Readiness and Support");
    expect(html).toContain("Next semester: recorded follow-up");
    expect(html).toContain("Review additional notes and follow-up information included with this report.");
    expect(html).not.toMatch(/Upload IEPs|Readiness Scorecard|30 \/ 90 \/ 180 \/ 365 Day Plan|Timeline, items flagged|nine-stage journey/);
    expect(WORKSPACE_STAGES.map(stage => stage.title)).toEqual(workspaceTitles);
    expect(workspaceTitles).toContain("Pathway Builder");
    expect(workspaceTitles).toContain("Readiness Scorecard");
  });

  it("preserves caller-specific sample framing and original navigation targets", () => {
    const html = renderToStaticMarkup(<PathwayReportBody sections={{
      family_action_plan: <p>Recorded travel context</p>,
      next_steps_30_90_180_365: <p>This semester</p>,
    }} sectionLabels={{ family_action_plan: "Family Context" }} stageCopy={{ family: { title: "Family Context", description: "Discuss the recorded travel options." },
      action: { title: "Sample Next Steps", description: "Use the recorded sample timeframes." } }} />);
    expect(html).toContain("Family Context");
    expect(html).toContain("Discuss the recorded travel options.");
    expect(html).toContain("Sample Next Steps");
    expect(html).toContain("Use the recorded sample timeframes.");
    expect(html).toContain('aria-label="Family Context"');
    expect(html).toContain('aria-label="Next Steps"');
    expect(html).toContain('id="stage-family"');
    expect(html).toContain('id="section-next_steps_30_90_180_365"');
  });

  it("exposes a stable anchor id per stage", () => {
    for (const stage of WORKSPACE_STAGES) {
      expect(reportStageAnchorId(stage.id)).toBe(`stage-${stage.id}`);
    }
  });
});


describe("source-defined empty section handling", () => {
  it("omits nested empty fragments in stages and appendix", () => {
    const html = renderToStaticMarkup(<PathwayReportBody sections={{
      student_snapshot: <div>Recorded snapshot</div>,
      family_action_plan: <>{null}<>{false}{[]}</></>,
      educator_action_plan: <>{false}</>,
      next_steps_30_90_180_365: [null, <>{undefined}</>],
    }} appendix={<>{null}<>{false}</></>} />);
    expect(stageOrder(html)).toEqual(["start"]);
    expect(sectionOrder(html)).toEqual(["student_snapshot"]);
    expect(html).not.toContain('id="report-appendix"');
    expect(html).not.toContain("Supporting Notes");
  });
  it("preserves a recorded step and an explicit empty-data explanation inside fragments", () => {
    const html = renderToStaticMarkup(<PathwayReportBody sections={{
      family_action_plan: <>{null}<p>No separate family step is recorded. Agree on support with the team.</p></>,
      next_steps_30_90_180_365: <>{false}<><p>Recorded next step and original timeframe.</p></></>,
    }} appendix={<><p>Evidence still needs team review.</p></>} />);
    expect(sectionOrder(html)).toEqual(["family_action_plan", "next_steps_30_90_180_365"]);
    expect(html).toContain("No separate family step is recorded.");
    expect(html).toContain("Recorded next step and original timeframe.");
    expect(html).toContain("Evidence still needs team review.");
  });
  it("does not treat a meaningful zero value as missing data", () => {
    const html = renderToStaticMarkup(<PathwayReportBody sections={{ data_gaps: <>0</> }} />);
    expect(sectionOrder(html)).toEqual(["data_gaps"]);
    expect(html).toContain(">0<");
  });
});
