// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: { children: React.ReactNode }) => <main id="main-content">{children}</main>,
}));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => async () => ({ items: [] }) }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/partnerforward.functions", () => ({
  listPartnerResourcesWithSaved: vi.fn(), savePartnerResource: vi.fn(),
  unsavePartnerResource: vi.fn(), updatePartnerSavedResource: vi.fn(),
}));
import { Route } from "../../src/routes/_authenticated/partners-manage_.resources";
afterEach(cleanup);
it("keeps Partner Resources inside the shared page's single main landmark", async () => {
  const Page = Route.options.component as React.ComponentType;
  render(<Page />);
  await screen.findByRole("heading", { name: "Partner Resources", exact: true });
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("main").querySelector("main")).toBeNull();
});
