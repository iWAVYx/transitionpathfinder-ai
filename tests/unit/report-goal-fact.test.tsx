// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReportGoalFact } from "@/components/documents/ReportGoalFact";
import { ReportGoalDetails } from "@/components/documents/ReportGoalDetails";
afterEach(cleanup);
it("keeps paired goal labels evenly anchored with full recorded values",()=>{
  const first="Recorded detail ".repeat(40); const next="Recorded next step";
  const {container}=render(<ReportGoalDetails><ReportGoalFact label="where things stand">{first}</ReportGoalFact><ReportGoalFact label="a possible next step">{next}</ReportGoalFact></ReportGoalDetails>);
  expect(screen.getByText("Where Things Stand")).toBeTruthy();expect(screen.getByText("A Possible Next Step")).toBeTruthy();
  const facts=container.querySelectorAll("[data-report-goal-fact]");expect(facts).toHaveLength(2);
  expect(facts[0].children[1].textContent).toBe(first);expect(facts[1].children[1].textContent).toBe(next);
  for(const fact of facts) expect(fact.className).toBe("min-w-0");
});
it("uses the same fact treatment for sample status/timeframe and source-specific draft goal wording",()=>{
  const {container}=render(<ReportGoalDetails><ReportGoalFact label="Planning Timeframe">This school year</ReportGoalFact><ReportGoalFact label="Draft Goal to Discuss"><span className="italic">Exact draft wording.</span></ReportGoalFact></ReportGoalDetails>);
  expect(screen.getByText("Exact draft wording.").className).toBe("italic");
  expect(container.querySelectorAll("[data-report-goal-fact] [data-document-subheading]")).toHaveLength(2);
  expect(screen.queryByText(/Baseline|Assessment|Agreed IEP/)).toBeNull();
});
