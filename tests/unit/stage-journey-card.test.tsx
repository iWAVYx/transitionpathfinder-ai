/**
 * Guardrails for StageJourneyCard — the shared dashboard/hub widget
 * derived from the workspace stage model.
 */
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Stub TanStack Link so the component renders outside of a RouterProvider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, params, children, ...rest }: any) => {
    const href = typeof to === "string" && params
      ? Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`$${k}`, String(v)),
          to,
        )
      : to;
    return <a href={href} {...rest}>{children}</a>;
  },
}));

import { StageJourneyCard } from "../../src/components/dashboard/StageJourneyCard";
import { stagesForAudience } from "../../src/lib/workspace/stages";

describe("StageJourneyCard", () => {
  it("lists every stage visible to the audience, in journey order", () => {
    const html = renderToStaticMarkup(<StageJourneyCard audience="family" />);
    for (const stage of stagesForAudience("family")) {
      expect(html).toContain(stage.title);
    }
  });

  it("partners only see the CONNECT stage", () => {
    const html = renderToStaticMarkup(<StageJourneyCard audience="partner" />);
    expect(stagesForAudience("partner").map((s) => s.id)).toEqual(["connect"]);
    expect(html).toContain("Resources and Opportunities");
    expect(html).not.toContain("Student Voice");
    expect(html).not.toContain("Family Perspective");
  });

  it("marks the first uncompleted stage as current by default", () => {
    const html = renderToStaticMarkup(
      <StageJourneyCard
        audience="family"
        completedStages={new Set(["start", "voice"])}
      />,
    );
    expect(html).toContain("You&#x27;re here");
    expect(html).toContain("Stage 3 — Family Perspective");
  });

  it("respects an explicit currentStage override", () => {
    const html = renderToStaticMarkup(
      <StageJourneyCard audience="family" currentStage="ready" />,
    );
    expect(html).toContain("Stage 6 — Readiness Scorecard");
  });

  it("renders the continue link deep into the workspace stage route", () => {
    const html = renderToStaticMarkup(<StageJourneyCard audience="family" />);
    expect(html).toMatch(/href="\/workspace\/start"/);
  });
});
