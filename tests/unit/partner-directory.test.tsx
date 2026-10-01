// @vitest-environment jsdom
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PartnerDirectoryPage } from "../../src/components/partner-network/PartnerDirectoryPage";

const loaders = vi.hoisted(() => ({ public: vi.fn(), signedIn: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/partner-network.functions", () => ({
  listPublicPartners: loaders.public,
  listPartnersForBrowse: loaders.signedIn,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: ComponentPropsWithoutRef<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock("@/components/site/TrustNote", () => ({ TrustNote: () => null }));
const partner = {
  id: "test",
  organization_name: "Test After School",
  partner_type: "community",
  description: "Accessible arts and science clubs",
  city: "Hartford",
  county: "Hartford",
  verification_status: "needs_review",
  collection_tags: ["after_school"],
  pathway_categories: ["creative_arts"],
  audience_served: ["middle_school"],
  is_featured: false,
  website_url: "https://example.org/program",
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  loaders.public.mockResolvedValue({ partners: [partner] });
  loaders.signedIn.mockResolvedValue({ partners: [partner] });
});
describe("real partner directory", () => {
  it("loads signed-in listings through authenticated browse and searches service, audience and region", async () => {
    render(<PartnerDirectoryPage signedIn />);
    await screen.findByRole("heading", { name: partner.organization_name });
    expect(loaders.signedIn).toHaveBeenCalledOnce();
    expect(loaders.public).not.toHaveBeenCalled();
    const search = screen.getByRole("textbox", { name: "Search partner directory" });
    for (const query of [" Hartford ", "middle_school", "creative_arts", "science"]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.queryByRole("heading", { name: partner.organization_name })).not.toBeNull();
    }
    fireEvent.change(search, { target: { value: "no such service" } });
    expect(screen.queryByRole("heading", { name: partner.organization_name })).toBeNull();
    expect(screen.getByText("No partners match those filters.")).not.toBeNull();
  });
  it("separates featured placement from verification and offers expandable information", async () => {
    loaders.public.mockResolvedValue({
      partners: [{ ...partner, verification_status: "featured" }],
    });
    render(<PartnerDirectoryPage />);
    await screen.findAllByRole("heading", { name: partner.organization_name });
    expect(screen.queryByText(/Verified partners/)).toBeNull();
    expect(screen.getAllByText("View organization information")[0].tagName).toBe("SUMMARY");
    fireEvent.click(screen.getByRole("button", { name: "After-school programs", exact: true }));
    expect(screen.getAllByRole("link", { name: "Visit website" })[0].getAttribute("href")).toBe(
      partner.website_url,
    );
  });
  it("distinguishes fetch failure from an empty directory and retries", async () => {
    loaders.signedIn.mockRejectedValueOnce(new Error("offline"));
    render(<PartnerDirectoryPage signedIn />);
    await screen.findByRole("alert");
    expect(screen.queryByText("No partners match those filters.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await screen.findByRole("heading", { name: partner.organization_name });
  });
});
