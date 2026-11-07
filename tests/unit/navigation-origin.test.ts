import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "@tanstack/react-router";
import { NavigationOrigins, navigationOriginLabel } from "../../src/lib/navigation-origin";

function fixture(start = "/") {
  const history = createMemoryHistory({ initialEntries: [start] });
  const tracker = new NavigationOrigins(history.location);
  history.subscribe(({ location, action }) => tracker.update(location, action.type));
  return { history, tracker };
}

describe("return to the actual source page", () => {
  it.each(["/", "/dashboard?student=fictional#widgets", "/caseload", "/school/overview", "/district/overview", "/partners-manage", "/owner", "/demo/dashboard?student=sample"]) (
    "retains %s including its selection and anchor", source => {
      const { history, tracker } = fixture(source);
      history.push("/calendar");
      expect(tracker.origin?.href).toBe(source);
      expect(tracker.origin?.index).toBe(0);
    });
  it("keeps the origin through filters, anchors and replacements", () => {
    const { history, tracker } = fixture("/?section=tools#planning");
    history.push("/calendar");
    history.push("/calendar?view=week");
    history.push("/calendar?view=week#agenda");
    history.replace("/calendar?view=agenda");
    expect(tracker.origin?.href).toBe("/?section=tools#planning");
    history.go(tracker.origin!.index - history.location.state.__TSR_index);
    expect(history.location.href).toBe("/?section=tools#planning");
  });
  it("does not turn Back and Forward into a navigation loop", () => {
    const { history, tracker } = fixture("/dashboard");
    history.push("/reports");
    history.push("/reports/fictional");
    history.back();
    expect(tracker.origin?.href).toBe("/dashboard");
    history.forward();
    expect(tracker.origin?.href).toBe("/reports");
    history.back(); history.back();
    expect(tracker.origin).toBeNull();
  });
  it.each(["/auth/callback?token=fictional", "/sign-in", "/checkout/return", "/?access_token=fictional", "/#refresh_token=fictional"]) (
    "does not revisit sensitive flow %s", source => {
      const { history, tracker } = fixture(source);
      history.push("/calendar");
      expect(tracker.origin).toBeNull();
    });
  it("does not invent an origin for a direct link or a new session", () => {
    const { history, tracker } = fixture("/calendar");
    expect(tracker.origin).toBeNull();
    history.push("/reports");
    expect(tracker.origin?.href).toBe("/calendar");
    expect(new NavigationOrigins(history.location).origin).toBeNull();
  });
  it("never exposes raw route identifiers as return labels", () => {
    expect(navigationOriginLabel("/school/overview")).toBe("School Dashboard");
    expect(navigationOriginLabel("/unknown/internal_code")).toBe("Previous Page");
  });
});
