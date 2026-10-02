// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TransitionCalendar } from "../../src/components/calendar/TransitionCalendar";

describe("shared calendar date navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 31, 12));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("visits February from January 31 and December from January", () => {
    render(<TransitionCalendar events={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Next", exact: true }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("February 2026");
    fireEvent.click(screen.getByRole("button", { name: "Previous", exact: true }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("January 2026");
    fireEvent.click(screen.getByRole("button", { name: "Previous", exact: true }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("December 2025");
  });

  it("moves agenda events with the week, respects filters, and returns to Today", () => {
    render(
      <TransitionCalendar
        initialView="agenda"
        events={[
          {
            id: "a",
            title: "Current week",
            type: "meeting",
            start: new Date(2026, 0, 31, 10).toISOString(),
          },
          {
            id: "b",
            title: "Next week",
            type: "meeting",
            start: new Date(2026, 1, 1, 0).toISOString(),
          },
          {
            id: "c",
            title: "Following week",
            type: "meeting",
            start: new Date(2026, 1, 8, 0).toISOString(),
          },
        ]}
      />,
    );
    let agenda = within(screen.getByRole("list", { name: "Events this week" }));
    expect(agenda.queryByText("Current week")).not.toBeNull();
    expect(agenda.queryByText("Next week")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next", exact: true }));
    agenda = within(screen.getByRole("list", { name: "Events this week" }));
    expect(agenda.queryByText("Current week")).toBeNull();
    expect(agenda.queryByText("Next week")).not.toBeNull();
    expect(agenda.queryByText("Following week")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Meetings", exact: true }));
    expect(screen.queryByRole("list", { name: "Events this week" })).toBeNull();
    expect(screen.queryByText("No events this week.")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Meetings", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Today", exact: true }));
    expect(
      within(screen.getByRole("list", { name: "Events this week" })).queryByText("Current week"),
    ).not.toBeNull();
  });
});
