// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PathwayReport } from "../../src/components/demo/PathwayReport";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import { ReportPdfButton } from "../../src/components/documents/ReportPdfButton";
import { liveReportContents } from "../../src/lib/report-contents";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
import { PathwayReportBody } from "../../src/components/pathway/report/PathwayReportBody";
import { PathwayReportSpine } from "../../src/components/pathway/report/PathwayReportSpine";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.classList.remove('print-magazine'); });
for (const id of ['sam','riley','jordan'] as const) for (const audience of ['student','family','educator'] as const) {
  it(`${id}/${audience} contents links land on exactly one actual report section`, () => {
    const {container} = render(<PathwayReport profile={getDemoProfile(id)} audience={audience} />);
    const links = screen.getByRole('navigation', {name: 'Table of contents'}).querySelectorAll('a');
    expect(links.length).toBe(8);
    expect(screen.getByRole('link', {name:'Next Steps', exact:true})).toBeTruthy();
    for (const link of links) {
      expect(container.querySelectorAll(link.getAttribute('href')!).length).toBe(1);
    }
    expect(screen.getByRole('button', {name:'Print or save Pathway Report as PDF'})).toBeTruthy();
  });
}
it('starts the shared PDF mode and cleans it up when printing ends', () => {
  vi.useFakeTimers();
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<ReportPdfButton />);
  fireEvent.click(screen.getByRole('button'));
  expect(document.body.classList.contains('print-magazine')).toBe(true);
  expect(print).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(60));
  expect(print).toHaveBeenCalledOnce();
  fireEvent(window, new Event('afterprint'));
  expect(document.body.classList.contains('print-magazine')).toBe(false);
});
it('unmount cancels a pending print dialog and restores the page', () => {
  vi.useFakeTimers();
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const {unmount} = render(<ReportPdfButton />);
  fireEvent.click(screen.getByRole('button'));
  unmount();
  act(() => vi.runAllTimers());
  expect(print).not.toHaveBeenCalled();
  expect(document.body.classList.contains('print-magazine')).toBe(false);
});
it('a print API failure does not leave the page in export mode', () => {
  vi.useFakeTimers();
  vi.spyOn(window, 'print').mockImplementation(() => {throw new Error('Print unavailable');});
  render(<ReportPdfButton />);
  fireEvent.click(screen.getByRole('button'));
  act(() => vi.runAllTimers());
  expect(document.body.classList.contains('print-magazine')).toBe(false);
});
it('newer report mode excludes hidden legacy sections while retaining applicable links', () => {
  const report = DEMO_STUDENTS.maya.report;
  const oldItems = liveReportContents(report, 'Maya');
  const newItems = liveReportContents(report, 'Maya', {hasV2:true});
  for (const id of ['sec-family-plan','sec-meeting-prep','sec-iep-translator','sec-opportunities','sec-educator-plan']) {
    expect(oldItems.some(item => item.id === id)).toBe(true);
    expect(newItems.some(item => item.id === id)).toBe(false);
  }
  expect(newItems.some(item => item.id === 'sec-pathways')).toBe(true);
  expect(oldItems.some(item => item.id === 'sec-partner-suggestions')).toBe(false);
  expect(liveReportContents(report, 'Maya', {hasLinkedStudent:true}).some(item => item.id === 'sec-partner-suggestions')).toBe(true);
});
it('the shared spine links have targets in the report body', () => {
  const present = new Set(['student_snapshot','next_steps_30_90_180_365'] as const);
  const {container} = render(<><PathwayReportSpine presentSections={present}/><PathwayReportBody sections={{student_snapshot:<p>Snapshot</p>,next_steps_30_90_180_365:<p>Actions</p>}} /></>);
  for (const link of container.querySelectorAll('nav a')) expect(container.querySelectorAll(link.getAttribute('href')!).length).toBe(1);
});

it("links saved student responses only when that response section is shown", () => {
  const report = DEMO_STUDENTS.maya.report;
  expect(liveReportContents(report, "Maya").some(item => item.id === "sec-your-voice")).toBe(false);
  const items = liveReportContents(report, "Maya", { hasStudentVoiceResponses: true });
  expect(items.filter(item => item.id === "sec-your-voice")).toEqual([{id: "sec-your-voice", label: "Your Voice in This Plan"}]);
  expect(items.some(item => item.id === "sec-student-voice")).toBe(true);
});
