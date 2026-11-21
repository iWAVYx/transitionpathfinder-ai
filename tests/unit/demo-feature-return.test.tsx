// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/demo/DemoHistoryExport", () => ({ DemoHistoryExport: () => null }));
vi.mock("@/lib/demo/use-demo-student", () => ({ useDemoStudent: () => ({ profileId: "jordan", profile: { displayName: "Sample Student" } }) }));
vi.mock("@/lib/demo/use-role-context", () => ({ useDemoSchool: () => ({ schoolId: "comprehensive" }), useDemoDistrict: () => ({ districtId: "regional-network" }), useDemoPartnerPlan: () => ({ planId: "free" }) }));
import { DemoFeatureShell } from "../../src/components/demo/DemoFeatureShell";
import { getDemoFeature } from "../../src/lib/demo/feature-routes";
afterEach(cleanup);
it("keeps the Owner demo's sole fallback return public and avoids a second private Back action", () => {
  render(<DemoFeatureShell role="owner" detail={getDemoFeature("owner", "role-audit")!} />);
  const returns = screen.getAllByRole("link").filter(link => /back to/i.test(link.textContent ?? ""));
  expect(returns).toHaveLength(1);
  expect(returns[0].getAttribute("href")).toBe("/demo/owner");
  expect(screen.queryByTestId("demo-feature-secondary-action-header")).toBeNull();
  expect(screen.getByTestId("demo-feature-primary-action-header").getAttribute("href")).toBe("/owner/role-audit");
});
