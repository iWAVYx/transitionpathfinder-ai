import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PathwayReportBody, reportStageAnchorId } from "@/components/pathway/report/PathwayReportBody";
import { WORKSPACE_STAGES } from "@/lib/workspace/stages";

describe("PathwayReportBody", () => {
  it("renders stage headers in canonical journey order for sections that are present", () => {
    const { container } = render(
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
    const stages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-report-stage]")
    ).map((el) => el.dataset.reportStage);
    expect(stages).toEqual(["start", "voice", "ready", "roadmap", "action", "connect"]);
  });

  it("skips stages when none of their sections are provided", () => {
    const { container } = render(
      <PathwayReportBody sections={{ student_snapshot: <div>snap</div> }} />
    );
    const stages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-report-stage]")
    ).map((el) => el.dataset.reportStage);
    expect(stages).toEqual(["start"]);
  });

  it("skips sections whose node is null/false (data-driven absence)", () => {
    const { container } = render(
      <PathwayReportBody
        sections={{
          student_snapshot: null,
          strengths_preferences_interests_needs: <div>spin</div>,
        }}
      />
    );
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-report-section]")
    ).map((el) => el.dataset.reportSection);
    expect(sections).toEqual(["strengths_preferences_interests_needs"]);
  });

  it("renders the appendix slot below the stage body", () => {
    const { container, getByText } = render(
      <PathwayReportBody
        sections={{ student_snapshot: <div>snap</div> }}
        appendix={<div>timeline</div>}
      />
    );
    expect(getByText("timeline")).toBeInTheDocument();
    expect(container.querySelector("#report-appendix")).not.toBeNull();
  });

  it("exposes a stable anchor id per stage", () => {
    for (const stage of WORKSPACE_STAGES) {
      expect(reportStageAnchorId(stage.id)).toBe(`stage-${stage.id}`);
    }
  });
});
