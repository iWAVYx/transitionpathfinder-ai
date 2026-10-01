import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TransitionCalendar } from "../../src/components/calendar/TransitionCalendar";

describe("shared calendar with signed-in event kinds", () => {
  it("renders live categories without relabeling private or team events as programs", () => {
    const html = renderToStaticMarkup(<TransitionCalendar initialView="agenda"
      eventTypes={["personal", "team", "prep", "deadline"]}
      events={["personal", "team", "prep", "deadline"].map((type) => ({
        id: type, title: `${type} event`, start: new Date().toISOString(),
        type: type as "personal" | "team" | "prep" | "deadline",
      }))} />);
    for (const label of ["Personal", "Team events", "Prep", "Deadlines"]) expect(html).toContain(label);
    expect(html).not.toContain('>Programs<');
    expect(html).not.toContain('Sample data');
    for (const type of ["personal", "team", "prep", "deadline"]) expect(html).toContain(`${type} event`);
  });
  it("keeps demo category defaults unchanged", () => {
    const html = renderToStaticMarkup(<TransitionCalendar events={[]} sample />);
    expect(html).toContain('Programs');
    expect(html).not.toContain('>Personal<');
  });
});
