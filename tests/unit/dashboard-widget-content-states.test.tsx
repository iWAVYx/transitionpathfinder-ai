// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
import { DashboardWidgetBoardView } from "../../src/components/dashboard/DashboardWidgetBoardView";
import type { DashboardWidgetRole } from "../../src/lib/dashboard/dashboard-widget-prefs.functions";
const empty = { entries: [], toolDestination: null };
const data = { actions: empty, calendar: empty, meetings: empty };
afterEach(cleanup);
describe("shared widget data states", () => {
  it.each([
    ["family", "connected student"], ["student", "student tools"],
    ["educator", "caseload tools"], ["school_admin", "school workspace"],
    ["district_admin", "district workspace"], ["partner", "partner profile"],
  ])("provides honest empty action guidance for %s", (role, phrase) => {
    render(<DashboardWidgetBoardView role={role as DashboardWidgetRole} widgets={["actions"]} available={["actions"]} data={data} update={() => {}} />);
    expect(screen.getByText("No active actions to show")).toBeTruthy();
    expect(screen.getByText(new RegExp(phrase))).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("keeps errors separate from empty records", () => {
    render(<DashboardWidgetBoardView role="family" widgets={["actions"]} available={["actions"]} data={{...data,actions:{...empty,error:true}}} update={() => {}} />);
    expect(screen.getByText("Could not load this widget.")).toBeTruthy();
    expect(screen.queryByText("No active actions to show")).toBeNull();
  });
  it("renders real entries instead of setup guidance", () => {
    render(<DashboardWidgetBoardView role="family" widgets={["actions"]} available={["actions"]} data={{...data,actions:{...empty,entries:[{id:"one",title:"Review saved plan",detail:"Due next week",to:"/next-actions"}]}}} update={() => {}} />);
    expect(screen.getByRole("link",{name:"Review saved plan"}).getAttribute("href")).toBe("/next-actions");
    expect(screen.getByText("Due next week")).toBeTruthy();
    expect(screen.queryByText("No active actions to show")).toBeNull();
  });
  it("uses the same empty layout while clearly identifying sample mode", () => {
    render(<DashboardWidgetBoardView sample role="student" widgets={["calendar"]} available={["calendar"]} data={data} update={() => {}} />);
    expect(screen.getByText("No upcoming calendar events")).toBeTruthy();
    expect(screen.getByText("This demo view has no sample items in this widget.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
