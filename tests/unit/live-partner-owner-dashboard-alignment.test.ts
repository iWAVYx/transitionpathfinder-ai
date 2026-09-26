import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildPartnerLivePreview } from "../../src/lib/dashboard/partner-live-preview";
import type { PartnerWorkspace } from "../../src/lib/partner-workspace.functions";

const read = (path: string) => readFileSync(path, "utf8");

const workspace: PartnerWorkspace = {
  is_partner: true,
  orgs: [],
  selected_org: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Forward Youth Programs",
    type: "partner",
    verified_status: "verified",
    website: "https://example.org",
    contact_email: "programs@example.org",
    city: "Hartford",
    state: "CT",
    address: null,
  },
  opportunities: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      organization_id: "11111111-1111-4111-8111-111111111111",
      title: "After-School Career Lab",
      description: null,
      opportunity_type: "community_resource",
      status: "approved",
      location: "Hartford",
      age_range: "14-18",
      eligibility: null,
      application_url: "https://example.org/apply",
      contact_email: null,
      created_at: "2026-09-20T12:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      organization_id: "11111111-1111-4111-8111-111111111111",
      title: "Weekend Enrichment Program",
      description: null,
      opportunity_type: "community_resource",
      status: "pending_review",
      location: "New Britain",
      age_range: null,
      eligibility: null,
      application_url: null,
      contact_email: null,
      created_at: "2026-09-21T12:00:00.000Z",
    },
  ],
};

describe("Partner and Owner live-dashboard parity", () => {
  it("builds Partner previews from the signed-in organization and real opportunity statuses", () => {
    const preview = buildPartnerLivePreview(workspace);

    expect(preview?.organization.name).toBe("Forward Youth Programs");
    expect(preview?.details["active-opportunities"].stats).toContainEqual({
      label: "Published",
      value: "1",
    });
    expect(preview?.details["submitted-programs"].stats).toContainEqual({
      label: "Pending",
      value: "1",
    });
    expect(preview?.details["active-opportunities"].rows[0]?.primary).toBe(
      "After-School Career Lab",
    );
    expect(JSON.stringify(preview)).not.toMatch(/IEP|student voice|pathway report/i);
  });

  it("fails closed when no authorized partner organization is connected", () => {
    expect(
      buildPartnerLivePreview({
        is_partner: false,
        orgs: [],
        selected_org: null,
        opportunities: [],
      }),
    ).toBeNull();
  });

  it("keeps demo fixtures out of the signed-in Partner Hub", () => {
    const hub = read("src/routes/_authenticated/hubs.partner.tsx");
    expect(hub).toContain("getPartnerWorkspace");
    expect(hub).toContain("NextActionCardServer");
    expect(hub).not.toContain("DEMO_NEXT_ACTIONS");
    expect(hub).not.toContain("DEMO_RECENTLY_COMPLETED");
  });

  it("uses /owner as the one Owner Hub and gives live cards Preview and Open Full Tool actions", () => {
    const legacyHub = read("src/routes/_authenticated/hubs.admin.tsx");
    const owner = read("src/components/owner/OwnerDashboardPage.tsx");

    expect(legacyHub).toContain('redirect({ to: "/owner", replace: true })');
    expect(legacyHub).not.toContain("DEMO_NEXT_ACTIONS");
    expect(owner).toContain("Private Owner Hub Preview");
    expect(owner).toContain("Preview live aggregate status here");
    expect(owner).toContain("Open Full Tool");
  });
});
