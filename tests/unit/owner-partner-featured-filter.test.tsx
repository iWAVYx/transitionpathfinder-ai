// @vitest-environment jsdom
import type { ComponentType, PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const api = vi.hoisted(() => ({ list: vi.fn(), write: vi.fn(), opportunities: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/owner/OwnerShell", () => ({
  OwnerShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/lib/partner-network.functions", () => ({
  listAdminPartners: api.list, setPartnerStatus: api.write,
  listOpportunitiesForPartner: api.opportunities, upsertOpportunity: api.write,
  archiveOpportunity: api.write, deleteOpportunity: api.write,
  bulkInsertOpportunities: api.write, opportunityItemSchema: {},
}));
import { Route } from "../../src/routes/_authenticated/owner.partner-network";
const Page = (Route as unknown as { component: ComponentType }).component;
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("filters featured placement independently of verification without changing records", async () => {
  const base = { partner_type: "community", city: "Hartford", county: "Hartford",
    outreach_status: "outreach_needed", is_public: true, collection_tags: [], pathway_categories: [] };
  api.list.mockResolvedValue({ partners: [
    { ...base, id: "1", organization_name: "Featured Lead", is_featured: true, verification_status: "potential" },
    { ...base, id: "2", organization_name: "Featured Verified", is_featured: true, verification_status: "verified" },
    { ...base, id: "3", organization_name: "Ordinary Verified", is_featured: false, verification_status: "verified" },
    { ...base, id: "4", organization_name: "Legacy Featured", is_featured: false, verification_status: "featured" },
  ] });
  render(<Page />);
  await screen.findByText("Ordinary Verified");
  fireEvent.click(screen.getByRole("button", { name: "Featured", exact: true }));
  expect(screen.getByText("Featured Lead")).toBeTruthy();
  expect(screen.getByText("Featured Verified")).toBeTruthy();
  expect(screen.getByText("Legacy Featured")).toBeTruthy();
  expect(screen.queryByText("Ordinary Verified")).toBeNull();
  expect(screen.getByRole("button", { name: "Featured", exact: true }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByRole("textbox", { name: "Search partner organizations" }), { target: { value: "Lead" } });
  expect(screen.getByText("Featured Lead")).toBeTruthy();
  expect(screen.queryByText("Featured Verified")).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Search partner organizations" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Verified", exact: true }));
  expect(screen.queryByText("Featured Lead")).toBeNull();
  expect(screen.queryByText("Legacy Featured")).toBeNull();
  expect(screen.getByText("Ordinary Verified")).toBeTruthy();
  expect(screen.getByText("Featured Verified")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Needs Review", exact: true })).toBeTruthy();
  expect(api.write).not.toHaveBeenCalled();
});
