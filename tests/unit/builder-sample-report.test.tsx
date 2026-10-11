import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
const reader = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: reader }));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search }: { children: ReactNode; to: string; search?: Record<string, string> }) => <a href={search ? `${to}?${new URLSearchParams(search)}` : to}>{children}</a>,
}));
import { BuilderSampleReport } from "../../src/components/demo/BuilderSampleReport";
it("opens the real report reader only with prepared sample content and demo controls", () => {
  const html = renderToStaticMarkup(<BuilderSampleReport audience="educator" />);
  const props = reader.mock.calls.at(-1)?.[0] as unknown as Record<string, unknown>;
  expect(props).toMatchObject({ demo: true, name: "Maya", initialAudience: "educator" });
  expect(props.studentId).toBeUndefined();
  expect(props.onSaveToProfile).toBeUndefined();
  expect(props.onRefresh).toBeUndefined();
  expect(html).toContain("does not reflect your edits");
  expect(html).toContain('href="/demo/intake?role=educator"');
});
