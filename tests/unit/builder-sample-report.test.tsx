// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const state = vi.hoisted(() => ({ navigate: vi.fn() }));
const reader = vi.hoisted(() => vi.fn((props: Record<string, unknown>): ReactNode => {
  const change = props.onAudienceChange as (audience: string) => void;
  return <article><h1>Sample Product Report</h1>{["student", "family", "educator"].map(audience => <button key={audience} onClick={() => change(audience)}>{audience} report view</button>)}</article>;
}));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: reader }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
  Link: ({ children, to, search }: { children: ReactNode; to: string; search?: Record<string, string> }) => <a href={search ? `${to}?${new URLSearchParams(search)}` : to}>{children}</a>,
}));
import { BuilderSampleReport } from "../../src/components/demo/BuilderSampleReport";
afterEach(() => { cleanup(); reader.mockClear(); state.navigate.mockReset(); });
it.each(["family", "educator"] as const)("opens the actual prepared reader for %s without extra title or mutation controls", audience => {
  const html = renderToStaticMarkup(<BuilderSampleReport audience={audience} />);
  const props = reader.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  expect(props).toMatchObject({ demo: true, name: "Maya", initialAudience: audience, controlledAudience: audience });
  expect(props.studentId).toBeUndefined(); expect(props.onSaveToProfile).toBeUndefined(); expect(props.onRefresh).toBeUndefined();
  expect(html).toContain("does not reflect your edits"); expect(html).toContain(`href="/demo/intake?role=${audience}"`);
  expect(html.match(/<h1\b/g)).toHaveLength(1); expect(html).toContain('<h2 class="font-display text-2xl">Prepared Example: Maya');
});
it.each(["family", "educator"] as const)("preserves eligible builder return role and report URL state from %s", origin => {
  const other = origin === "family" ? "educator" : "family";
  render(<BuilderSampleReport audience={origin} />);
  let eligible = origin;
  for (const next of [other, "student", origin] as const) {
    fireEvent.click(screen.getByRole("button", { name: `${next} report view` }));
    if (next !== "student") eligible = next;
    expect(screen.getByRole("link", { name: /Back to Pathway Builder/ }).getAttribute("href")).toBe(`/demo/intake?role=${eligible}`);
    const navigation = state.navigate.mock.calls.at(-1)![0];
    expect(screen.getByRole("link", { name: "See Sample Plan Details and Review Notes" }).getAttribute("href")).toContain(`view=${next}`);
    expect(navigation.to).toBe("/demo/report"); expect(navigation.resetScroll).toBe(false);
    expect(navigation.search({ example: "builder", role: origin, preserved: "context" })).toEqual({ example: "builder", role: eligible, view: next, preserved: "context" });
  }
  for (const [props] of reader.mock.calls) {
    expect(props.name).toBe("Maya"); expect(props.demo).toBe(true); expect(props.studentId).toBeUndefined(); expect(props.onRefresh).toBeUndefined();
  }
});
it("an explicit new builder origin resets the return role without altering the sample", () => {
  const view = render(<BuilderSampleReport audience="family" />);
  fireEvent.click(screen.getByRole("button", { name: "educator report view" }));
  view.rerender(<BuilderSampleReport audience="educator" />);
  fireEvent.click(screen.getByRole("button", { name: "family report view" }));
  view.rerender(<BuilderSampleReport audience="family" />);
  expect(screen.getByRole("link", { name: /Back to Pathway Builder/ }).getAttribute("href")).toBe("/demo/intake?role=family");
  expect(reader.mock.calls.at(-1)![0].initialAudience).toBe("family");
});
