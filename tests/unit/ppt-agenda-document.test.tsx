// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PptAgendaDocument } from "../../src/components/documents/PptAgendaDocument";
const agenda = {
  opening_note: "Review the student's cooking goal together.",
  agenda: [{ title: "Check current progress", minutes: 10, purpose: "Compare dated observations before deciding next steps." }],
  questions_to_ask: ["Which written directions help?"],
  evidence_to_bring: ["Bring a dated work sample."],
  language_that_works: ["Family: Could we agree on a review date?"],
  if_things_get_stuck: "Record open questions and name who will follow up.",
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("keeps the complete saved document content, branding and print action", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<PptAgendaDocument name="Sample student" agenda={agenda} studentId={null} meetingDate={null} onReset={() => {}} />);
  for (const text of [agenda.opening_note, agenda.agenda[0].purpose, ...agenda.questions_to_ask, ...agenda.evidence_to_bring, agenda.if_things_get_stuck]) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.getByText(/Family: Could we agree on a review date/)).toBeTruthy();
  expect(screen.getByAltText("TransitionForward")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "+ Action" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Print / save as PDF" }));
  expect(print).toHaveBeenCalledOnce();
});
it("delegates linked-student actions to the route without altering document text", () => {
  const add = vi.fn().mockResolvedValue(undefined);
  render(<PptAgendaDocument name="Sample student" agenda={agenda} studentId="sample-student" meetingDate={null} onAddAction={add} onReset={() => {}} />);
  fireEvent.click(screen.getAllByRole("button", { name: "+ Action" })[0]);
  expect(add).toHaveBeenCalledWith(agenda.questions_to_ask[0]);
});
