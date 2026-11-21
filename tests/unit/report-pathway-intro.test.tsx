// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReportPathwayHeading, ReportPathwaySummary } from "@/components/documents/ReportPathwayIntro";
import { RecommendationCard } from "@/components/pathway/RecommendationCard";
afterEach(cleanup);
it("shares a compact wrapping title row while retaining complete badge and summary text",()=>{
  const summary="Complete recorded explanation ".repeat(30);
  const {container}=render(<><ReportPathwayHeading title="education and training" badges={<span>Recorded Category</span>} /><ReportPathwaySummary kind="fit">{summary}</ReportPathwaySummary></>);
  expect(screen.getByRole("heading",{level:3,name:"Education and Training"})).toBeTruthy();
  expect(screen.getByText("Recorded Category")).toBeTruthy();
  expect(container.querySelector('[data-report-pathway-summary]')!.textContent).toBe(summary);
  expect(container.querySelector('[data-report-pathway-heading] h3')!.className).toContain("min-w-0");
});
it.each(["student","family","educator"] as const)("actual %s recommendations keep source, action, owner and timeframe fields",audience=>{
  const {container}=render(<RecommendationCard audience={audience} rec={{title:"training pathway",summary:"Recorded summary",why:"Recorded why",sources:[{kind:"profile",label:"Recorded profile"}],next_action:"Recorded next action",owner_role:"educator",timeframe:"90_day",discuss_at_next_meeting:true}} />);
  expect(container.querySelector('article > header[data-report-pathway-heading]')).toBeTruthy();
  expect(screen.getByRole("heading",{level:3,name:"Training Pathway"})).toBeTruthy();
  for(const value of ["Recorded summary","Recorded why","Recorded next action","Educator","Next 90 days","Discuss at next meeting"]) expect(screen.getByText(value,{exact:true})).toBeTruthy();
  expect(Boolean(container.querySelector('[data-report-recommendation-field="sources"]'))).toBe(audience!=="student");
});
