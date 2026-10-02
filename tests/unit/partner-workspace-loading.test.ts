import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ adminFrom: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (data: unknown) => data;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof parse) => {
        parse = fn;
        return builder;
      },
      handler:
        (fn: any) =>
        ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.adminFrom },
}));
vi.mock("@/lib/authz", () => ({ assertAuthorized: vi.fn() }));
vi.mock("@/lib/entitlement-guard", () => ({ requireFeatureEntitlement: vi.fn() }));
import { getPartnerWorkspace } from "../../src/lib/partner-workspace.functions";

const load = getPartnerWorkspace as unknown as (args: any) => Promise<any>;
const orgId = "11111111-1111-4111-8111-111111111111";
const otherOrgId = "22222222-2222-4222-8222-222222222222";
const org = { id: orgId, name: "Synthetic partner", type: "partner" };
const failed = { data: null, error: { message: "internal database detail" } };

function query(result: any) {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  for (const method of ["select", "eq", "in", "order"]) chain[method].mockReturnValue(chain);
  return chain;
}
function setup({
  membership = { data: [{ organization_id: orgId }], error: null },
  organizations = { data: [org], error: null },
  opportunities = { data: [], error: null },
}: any = {}) {
  const members = query(membership);
  const orgs = query(organizations);
  const listings = query(opportunities);
  mocks.adminFrom.mockImplementation((table: string) => {
    if (table === "organizations") return orgs;
    if (table === "partner_opportunities") return listings;
    throw new Error("Unexpected table");
  });
  return {
    context: { supabase: { from: vi.fn().mockReturnValue(members) }, userId: "partner" },
    orgs,
    listings,
  };
}
beforeEach(() => vi.resetAllMocks());

describe("partner workspace loading", () => {
  it("fails on membership errors before attempting any elevated reads", async () => {
    const { context } = setup({ membership: failed });
    await expect(load({ data: {}, context })).rejects.toThrow("Could not load partner membership");
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
  it("keeps a successfully empty membership distinct from a failed query", async () => {
    const { context } = setup({ membership: { data: [], error: null } });
    expect(await load({ data: {}, context })).toEqual({
      is_partner: false,
      orgs: [],
      selected_org: null,
      opportunities: [],
    });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
  it("does not turn an organization read failure into a setup prompt", async () => {
    const { context } = setup({ organizations: failed });
    await expect(load({ data: {}, context })).rejects.toThrow(
      "Could not load partner organizations",
    );
    expect(mocks.adminFrom).not.toHaveBeenCalledWith("partner_opportunities");
  });
  it("does not turn an opportunity read failure into an empty list", async () => {
    const { context } = setup({ opportunities: failed });
    await expect(load({ data: {}, context })).rejects.toThrow("Could not load opportunities");
  });
  it("accepts an empty opportunity list and scopes elevated reads to membership even for another requested org", async () => {
    const { context, orgs, listings } = setup();
    const result = await load({ data: { org_id: otherOrgId }, context });
    expect(orgs.in).toHaveBeenCalledWith("id", [orgId]);
    expect(listings.eq).toHaveBeenCalledWith("organization_id", orgId);
    expect(result).toMatchObject({ is_partner: true, selected_org: org, opportunities: [] });
  });
});
