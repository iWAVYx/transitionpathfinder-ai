// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ token: "first-token", resolve: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.resolve }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => ({ options, useParams: () => ({ token: mocks.token }) }) }));
vi.mock("@/lib/share.functions", () => ({ resolveShareToken: {} }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/pathway/ReportChapterPager", () => ({ ReportChapterPager: () => null }));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: ({ report, fixedAudience, readOnly, hasV2 }: any) =>
  <article data-testid="report" data-audience={fixedAudience} data-readonly={String(readOnly)} data-v2={String(hasV2)}>{report.summary}</article> }));
import { Route } from "../../src/routes/share.$token";
const Page = Route.options.component as () => any;
afterEach(cleanup);
beforeEach(() => { mocks.token = "first-token"; mocks.resolve.mockReset(); });
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { resolve, reject, promise };
}
const response = (summary: string, version = 1) => ({ ok: true, audience: "family", report: { summary, schema_version: version } });
it("removes an earlier shared report while the next token resolves", async () => {
  const first = deferred(), second = deferred();
  mocks.resolve.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<Page />);
  await act(async () => first.resolve(response("First report")));
  expect(screen.getByText("First report")).toBeTruthy();
  mocks.token = "second-token"; view.rerender(<Page />);
  expect(screen.queryByText("First report")).toBeNull();
  expect(screen.getByText(/Opening the shared report/)).toBeTruthy();
  await act(async () => second.resolve(response("Current report", 2)));
  const report = screen.getByTestId("report");
  expect(report.textContent).toBe("Current report");
  expect(report.getAttribute("data-audience")).toBe("family");
  expect(report.getAttribute("data-readonly")).toBe("true");
  expect(report.getAttribute("data-v2")).toBe("undefined");
});
it("ignores a previous token's late success", async () => {
  const first = deferred(), second = deferred();
  mocks.resolve.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<Page />);
  mocks.token = "second-token"; view.rerender(<Page />);
  await act(async () => second.resolve(response("Current report")));
  await act(async () => first.resolve(response("Outdated report")));
  expect(screen.getByText("Current report")).toBeTruthy();
  expect(screen.queryByText("Outdated report")).toBeNull();
  expect(screen.getByTestId("report").getAttribute("data-v2")).toBe("undefined");
});
it("ignores a previous token's late error", async () => {
  const first = deferred(), second = deferred();
  mocks.resolve.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<Page />);
  mocks.token = "second-token"; view.rerender(<Page />);
  await act(async () => second.resolve(response("Current report")));
  await act(async () => first.reject(new Error("Unavailable")));
  expect(screen.getByText("Current report")).toBeTruthy();
});
it("shows an unavailable link when the current token is revoked or expired", async () => {
  mocks.resolve.mockResolvedValue({ ok: false });
  render(<Page />);
  expect(await screen.findByText("This Share Link Is No Longer Active.")).toBeTruthy();
  expect(screen.queryByTestId("report")).toBeNull();
});
