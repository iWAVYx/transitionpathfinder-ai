import { expect, it } from "vitest";
import { createMemoryHistory } from "@tanstack/react-router";
import { NavigationScrollIntent, PendingScrollReturn } from "../../src/hooks/use-navigation-scroll-intent";

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

it("retains departure when Back interrupts a visible tool before route acknowledgement", () => {
  const pending = new PendingScrollReturn();
  const source = { href: "/school/overview?org_id=sample", pathname: "/school/overview" };
  pending.begin(source, { href: "/school/support-needs?org_id=sample", pathname: "/school/support-needs" }, { scrollX: 0, scrollY: 1684 });
  pending.arrive(source.href);
  pending.begin(source, source, { scrollX: 0, scrollY: 0 });
  expect(pending.position(source.href)).toEqual({ scrollX: 0, scrollY: 1684 });
  pending.settle();
  expect(pending.position(source.href)).toEqual({ scrollX: 0, scrollY: 1684 });
  expect(pending.position("/school/overview?org_id=other")).toBeUndefined();
  pending.arrive("/calendar");
  expect(pending.position(source.href)).toBeUndefined();
});
it("leaves completed-route returns to normal router restoration", () => {
  const pending = new PendingScrollReturn();
  const source = { href: "/demo/family", pathname: "/demo/family" };
  const tool = { href: "/demo/calendar", pathname: "/demo/calendar" };
  pending.begin(source, tool, { scrollX: 0, scrollY: 800 });
  pending.settle();
  pending.begin(tool, source, { scrollX: 0, scrollY: 0 });
  expect(pending.position(source.href)).toBeUndefined();
});
it("does not turn initial loads or same-page filters into interrupted departures", () => {
  const pending = new PendingScrollReturn();
  const source = { href: "/district/overview", pathname: "/district/overview" };
  pending.begin(undefined, source, { scrollX: 0, scrollY: 0 });
  pending.begin(source, { ...source, href: source.href + "?district_id=sample" }, { scrollX: 0, scrollY: 44 });
  pending.begin(source, source, { scrollX: 0, scrollY: 0 });
  expect(pending.position(source.href)).toBeUndefined();
});
