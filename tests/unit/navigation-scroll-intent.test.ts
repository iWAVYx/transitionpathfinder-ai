import { expect, it } from "vitest";
import { createMemoryHistory } from "@tanstack/react-router";
import { NavigationScrollIntent } from "../../src/hooks/use-navigation-scroll-intent";

it.each(["/", "/dashboard", "/caseload", "/school/overview", "/district/overview", "/partners-manage", "/owner", "/demo/family"])(
  "distinguishes forward arrival and backward restoration from %s", source => {
    const history = createMemoryHistory({ initialEntries: [source] });
    const tracker = new NavigationScrollIntent(history.location);
    history.subscribe(({ location, action }) => tracker.update(location, action.type));
    expect(tracker.intent).toBe("restore");
    history.push("/pathways/education");
    expect(tracker.intent).toBe("top");
    history.replace("/pathways/education?step=1");
    expect(tracker.intent).toBe("top");
    history.back();
    expect(tracker.intent).toBe("restore");
    history.forward();
    expect(tracker.intent).toBe("top");
    history.go(-1);
    expect(tracker.intent).toBe("restore");
    history.go(1);
    expect(tracker.intent).toBe("top");
  },
);
it("preserves same-page filters and canonicalization without replacing backward intent", () => {
  const history = createMemoryHistory({ initialEntries: ["/demo/family"] });
  const tracker = new NavigationScrollIntent(history.location);
  history.subscribe(({ location, action }) => tracker.update(location, action.type));
  history.replace("/demo/family?student=jordan");
  expect(tracker.intent).toBe("restore");
  history.push("/demo/family?student=sam");
  expect(tracker.intent).toBe("preserve");
  history.push("/demo/calendar");
  history.back();
  history.replace("/demo/family?student=sam&view=all");
  expect(tracker.intent).toBe("restore");
});
