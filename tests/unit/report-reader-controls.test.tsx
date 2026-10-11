import { generatePathwayReport } from "../../src/lib/demo/pathway-engine";
import { READINESS_LABELS } from "../../src/components/documents/ReportReadinessRow";
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
    expect(links.length).toBe(13);
    expect(links[0].getAttribute('href')).toBe('#demo-report-overview');
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('#demo-report-overview h2')!.textContent).toBe('At a Glance');
    const profile = getDemoProfile(id);
    const readiness = container.querySelector('#section-readiness_scorecard')!;
    const rows = readiness.querySelectorAll('[data-report-readiness-row]');
    expect(rows).toHaveLength(4);
    for (const [i, area] of (['education','employment','living','advocacy'] as const).entries()) {
      expect(rows[i].textContent).toContain(READINESS_LABELS[profile.readiness.byArea[area]]);
    }
    expect(readiness.querySelector('[data-demo-readiness-overall]')!.textContent).toContain(READINESS_LABELS[profile.readiness.overall]);
    expect(rows[1].textContent).toContain(profile.demographics.gradeNumber < 11 ? 'Career Exploration' : 'Work Preparation');
    expect(readiness.querySelector('[role="progressbar"]')).toBeNull();
    const goals = container.querySelectorAll('[data-report-recorded-goal]');
    expect(goals).toHaveLength(profile.goals.length);
    const statuses = {not_started:'Not Started',in_progress:'In Progress',on_track:'On Track',needs_review:'Needs Review'};
    const horizons = {next_semester:'Next Semester',this_year:'This Year',next_year:'Next Year','2_to_3_years':'2–3 Years'};
    for (const [i, goal] of profile.goals.entries()) {
      expect(goals[i].querySelector('[data-report-recorded-goal-title]')!.textContent).toBe(goal.title);
      expect(goals[i].querySelectorAll('dd')[0].textContent).toBe(statuses[goal.status]);
      expect(goals[i].querySelectorAll('dd')[1].textContent).toBe(horizons[goal.horizon]);
    }
    const sourceSteps = generatePathwayReport(profile).nextSteps;
    const actionGroups = container.querySelectorAll('[data-demo-action-group]');
    const focus = audience === 'educator' ? 'school_team' : audience;
    expect(actionGroups[0].getAttribute('data-demo-action-group')).toBe(sourceSteps.some(step => step.owner === focus) ? focus : 'shared');
    expect(container.querySelectorAll('[data-demo-next-step]')).toHaveLength(sourceSteps.length);
    for (const step of sourceSteps) {
      const cards = container.querySelectorAll(`[data-demo-next-step="${step.id}"]`);
      expect(cards).toHaveLength(1);
      expect(cards[0].closest('[data-demo-action-group]')!.getAttribute('data-demo-action-group')).toBe(step.owner);
      expect(cards[0].textContent).toContain(step.detail);
      expect(cards[0].textContent).toContain(`Review in ${step.reviewByMonths} mo`);
    }
    expect(!!container.querySelector('[data-demo-no-role-action]')).toBe(!sourceSteps.some(step => step.owner === focus));
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
  const items = liveReportContents(report, "Maya", { audience: "student", hasStudentVoiceResponses: true });
  expect(items.filter(item => item.id === "sec-your-voice")).toEqual([{id: "sec-your-voice", label: "Your Voice in This Plan"}]);
  expect(items.some(item => item.id === "sec-student-voice")).toBe(true);
});

it('preserves a review-needed goal and its original multi-year horizon', () => {
  const profile = {...getDemoProfile('jordan'), goals: [{area:'education' as const,title:'Review the program with the student.',status:'needs_review' as const,horizon:'2_to_3_years' as const}]};
  const {container} = render(<PathwayReport profile={profile} audience="family" />);
  const goal = container.querySelector('[data-report-recorded-goal]')!;
  expect(goal.querySelector('[data-report-recorded-goal-title]')!.textContent).toBe(profile.goals[0].title);
  expect(goal.textContent).toContain('Needs Review');
  expect(goal.textContent).toContain('2–3 Years');
  expect(goal.textContent).not.toContain('30 days');
});


it("report contents follow the stage reader order, including sample appendices and team questions", () => {
  const report = DEMO_STUDENTS.maya.report;
  const extraItems = [{id: "sec-source-notes", label: "Sources & Information Used"}];
  const ids = liveReportContents(report, "Maya", {audience: "student", hasStudentVoiceResponses: true, hasLinkedStudent: true, extraItems}).map(item => item.id);
  expect(ids).toEqual([
    "sec-snapshot", "sec-your-voice", "sec-student-voice", "sec-spin", "sec-strengths",
    "sec-family-plan", "sec-meeting-prep", "sec-educator-plan", "sec-iep-translator", "sec-data-gaps",
    "sec-readiness", "sec-goals", "sec-pathways", "sec-education", "sec-careers", "sec-life-skills",
    "sec-thirty-day", "sec-source-notes", "sec-opportunities", "sec-partner-suggestions", "sec-timeline",
    "sec-review", "report-team-questions",
  ]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(extraItems).toEqual([{id: "sec-source-notes", label: "Sources & Information Used"}]);
});

it.each(["family", "educator"] as const)("%s contents cannot advertise the Student-only saved-response section", audience => {
  const items = liveReportContents(DEMO_STUDENTS.maya.report, "Maya", {audience, hasStudentVoiceResponses: true});
  expect(items.some(item => item.id === "sec-your-voice")).toBe(false);
  expect(items.some(item => item.id === "report-team-questions")).toBe(true);
});
