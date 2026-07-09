/**
 * Guardrails for StageJourneyCard — the shared dashboard/hub widget
 * derived from the workspace stage model.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";

import { StageJourneyCard } from "../../src/components/dashboard/StageJourneyCard";
import { stagesForAudience } from "../../src/lib/workspace/stages";

function renderInRouter(ui: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{ui}</>,
  });
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/workspace/$stage",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, workspaceRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe("StageJourneyCard", () => {
  it("lists every stage visible to the audience, in journey order", () => {
    const html = renderInRouter(<StageJourneyCard audience="family" />);
    const visibleStages = stagesForAudience("family");
    for (const stage of visibleStages) {
      expect(html).toContain(stage.title);
    }
  });

  it("partners only see the CONNECT stage", () => {
    const html = renderInRouter(<StageJourneyCard audience="partner" />);
    const partnerStages = stagesForAudience("partner");
    expect(partnerStages.map((s) => s.id)).toEqual(["connect"]);
    expect(html).toContain("Resources and Opportunities");
    // No student planning surfaces leak in
    expect(html).not.toContain("Student Voice");
    expect(html).not.toContain("Family Perspective");
  });

  it("marks the first uncompleted stage as current by default", () => {
    const html = renderInRouter(
      <StageJourneyCard
        audience="family"
        completedStages={new Set(["start", "voice"])}
      />,
    );
    // FAMILY is the third stage; it should be the current one.
    expect(html).toContain("You're here");
    expect(html).toContain("Stage 3 — Family Perspective");
  });

  it("respects an explicit currentStage override", () => {
    const html = renderInRouter(
      <StageJourneyCard audience="family" currentStage="ready" />,
    );
    expect(html).toContain("Stage 6 — Readiness Scorecard");
  });

  it("renders the continue link deep into the workspace stage route", () => {
    const html = renderInRouter(<StageJourneyCard audience="family" />);
    expect(html).toMatch(/href="\/workspace\/start"/);
  });
});
