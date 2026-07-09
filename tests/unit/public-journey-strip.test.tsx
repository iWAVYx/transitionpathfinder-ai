/**
 * Guardrails for PublicJourneyStrip — the marketing-surface rail
 * derived from the shared workspace stage model.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicJourneyStrip } from "../../src/components/site/PublicJourneyStrip";
import { WORKSPACE_STAGES } from "../../src/lib/workspace/stages";

describe("PublicJourneyStrip", () => {
  const html = renderToStaticMarkup(<PublicJourneyStrip />);

  it("renders every workspace stage in journey order", () => {
    const stageLabels = Array.from(
      html.matchAll(/data-stage="([a-z]+)"/g),
      (m) => m[1],
    );
    expect(stageLabels).toEqual(WORKSPACE_STAGES.map((s) => s.id));
  });

  it("shows the single all-caps stage label and its Title Case title", () => {
    for (const stage of WORKSPACE_STAGES) {
      expect(html).toContain(stage.label);
      expect(html).toContain(stage.title);
    }
  });

  it("carries a stable testid so marketing tests can find it", () => {
    expect(html).toContain('data-testid="public-journey-strip"');
  });
});
