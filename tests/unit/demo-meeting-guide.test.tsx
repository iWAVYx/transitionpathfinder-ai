// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoMeetingGuide } from "../../src/components/demo/DemoMeetingGuide";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import { demoMeetingGuide } from "../../src/lib/demo/meeting-guide";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it.each(["family", "educator"] as const)("%s demo renders and prints the real document without live actions", role => {
  const profile = getDemoProfile("riley");
  const guide = demoMeetingGuide(profile, role);
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const { container } = render(<DemoMeetingGuide profile={profile} role={role} />);
  expect(container.querySelector("[data-ppt-print-packet]")).toBeTruthy();
  expect(container.querySelector("[data-ppt-print-packet] [data-document-sample-notice]")).toBeTruthy();
  expect(screen.getByText(guide.opening_note)).toBeTruthy();
  expect(guide.opening_note).toContain("Fictional sample");
  expect(guide.opening_note).toContain(profile.goals[0].title);
  expect(guide.questions_to_ask.join(" ")).toContain(profile.goals[0].title);
  expect(guide.language_that_works.every(script => script.startsWith(role === "family" ? "Family:" : "Educator:"))).toBe(true);
  expect(screen.queryByRole("button", { name: "+ Action" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Prep another meeting" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Print / save as PDF" }));
  expect(print).toHaveBeenCalledOnce();
});
it("changing the sample student changes meeting content", () => {
  const first = demoMeetingGuide(getDemoProfile("sam"), "family");
  const second = demoMeetingGuide(getDemoProfile("riley"), "family");
  expect(first.opening_note).not.toBe(second.opening_note);
  expect(first.questions_to_ask).not.toEqual(second.questions_to_ask);
});
