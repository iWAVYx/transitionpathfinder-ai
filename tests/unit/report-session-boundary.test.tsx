// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportSessionBoundary } from "../../src/components/pathway/ReportSessionBoundary";
import type { PathwayReport } from "../../src/lib/pathway.functions";
afterEach(cleanup);
function Reader({ report }: { report: PathwayReport }) {
  const [summary, setSummary] = useState(report.summary);
  return <><p>{summary}</p><button onClick={() => setSummary("Translated first report")}>Translate</button></>;
}
const first = { summary: "First report" } as PathwayReport;
const second = { summary: "Second report" } as PathwayReport;
it("resets a displayed translation before committing a replacement report", () => {
  const view = render(<ReportSessionBoundary report={first}><Reader report={first} /></ReportSessionBoundary>);
  fireEvent.click(screen.getByRole("button", { name: "Translate" }));
  expect(screen.getByText("Translated first report")).toBeTruthy();
  view.rerender(<ReportSessionBoundary report={second}><Reader report={second} /></ReportSessionBoundary>);
  expect(screen.getByText("Second report")).toBeTruthy();
  expect(screen.queryByText("Translated first report")).toBeNull();
});
it("preserves temporary state on ordinary rerenders of the same context", () => {
  const view = render(<ReportSessionBoundary report={first} studentId="first"><Reader report={first} /></ReportSessionBoundary>);
  fireEvent.click(screen.getByRole("button", { name: "Translate" }));
  view.rerender(<ReportSessionBoundary report={first} studentId="first"><Reader report={first} /></ReportSessionBoundary>);
  expect(screen.getByText("Translated first report")).toBeTruthy();
});
it.each(["student", "name", "demo", "readonly"])("resets state when the %s context changes even with the same report object", (change) => {
  const view = render(<ReportSessionBoundary report={first} studentId="first" studentName="First" demo={false} readOnly={false}><Reader report={first} /></ReportSessionBoundary>);
  fireEvent.click(screen.getByRole("button", { name: "Translate" }));
  view.rerender(<ReportSessionBoundary report={first} studentId={change === "student" ? "second" : "first"}
    studentName={change === "name" ? "Second" : "First"} demo={change === "demo"} readOnly={change === "readonly"}>
    <Reader report={first} />
  </ReportSessionBoundary>);
  expect(screen.getByText("First report")).toBeTruthy();
  expect(screen.queryByText("Translated first report")).toBeNull();
});
