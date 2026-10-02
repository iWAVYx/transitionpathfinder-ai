import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn() }));
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
vi.mock("@/lib/authz", () => ({ assertAuthorized: mocks.authorize }));
vi.mock("@/lib/entitlement-guard", () => ({ requireFeatureEntitlement: vi.fn() }));
import {
  editOpportunityDetails,
  withdrawOpportunityForEditing,
} from "../../src/lib/partner-workspace.functions";
import { opportunityEditSchema } from "../../src/lib/partner-opportunity-edit";

const data = {
  id: "11111111-1111-4111-8111-111111111111",
  expected_updated_at: "2026-10-02T12:00:00+00:00",
  title: "New title",
  description: "Details",
  opportunity_type: "internship",
  location: "Hartford",
  age_range: "16–21",
  eligibility: "Contact for supports",
  application_url: "https://example.org/apply",
  contact_email: "program@example.org",
};
const invoke = editOpportunityDetails as unknown as (args: any) => Promise<unknown>;
const withdraw = withdrawOpportunityForEditing as unknown as (args: any) => Promise<unknown>;
function database(result: any = { data: { id: data.id }, error: null }) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return {
    query,
    context: { supabase: { from: vi.fn().mockReturnValue(query) }, userId: "partner" },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue(undefined);
});
describe("partner draft editing boundary", () => {
  it("withdraws only the original pending revision without changing content", async () => {
    const { query, context } = database();
    const { id, expected_updated_at } = data;
    await withdraw({ data: { id, expected_updated_at }, context });
    expect(mocks.authorize).toHaveBeenCalled();
    expect(query.update).toHaveBeenCalledWith({ status: "draft" });
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["status", "pending_review"],
      ["updated_at", expected_updated_at],
    ]);
  });
  it("cannot withdraw a submission already approved or edited by another user", async () => {
    const { context } = database({ data: null, error: null });
    await expect(
      withdraw({ data: { id: data.id, expected_updated_at: data.expected_updated_at }, context }),
    ).rejects.toThrow("no longer pending review");
  });
  it("does not withdraw when partner authorization fails", async () => {
    mocks.authorize.mockRejectedValue(new Error("denied"));
    const { query, context } = database();
    await expect(
      withdraw({ data: { id: data.id, expected_updated_at: data.expected_updated_at }, context }),
    ).rejects.toThrow("denied");
    expect(query.update).not.toHaveBeenCalled();
  });
  it("updates all editable fields under the caller's RLS, draft status and original revision", async () => {
    const { query, context } = database();
    await invoke({ data, context });
    expect(mocks.authorize).toHaveBeenCalled();
    const { id, expected_updated_at, ...fields } = data;
    expect(query.update).toHaveBeenCalledWith(fields);
    expect(query.eq.mock.calls).toEqual([
      ["id", id],
      ["status", "draft"],
      ["updated_at", expected_updated_at],
    ]);
  });
  it("does not report success for stale, inaccessible, or non-draft rows", async () => {
    const { context } = database({ data: null, error: null });
    await expect(invoke({ data, context })).rejects.toThrow("no longer an editable draft");
  });
  it("stops before updating when capability authorization fails", async () => {
    mocks.authorize.mockRejectedValue(new Error("denied"));
    const { query, context } = database();
    await expect(invoke({ data, context })).rejects.toThrow("denied");
    expect(query.update).not.toHaveBeenCalled();
  });
  it("cannot add status or organization changes to a details edit", () => {
    for (const extra of [{ status: "approved" }, { organization_id: data.id }]) {
      expect(opportunityEditSchema.safeParse({ ...data, ...extra }).success).toBe(false);
    }
  });
  it("validates lengths, email and web links, and permits clearing optional values", () => {
    for (const patch of [
      { title: " " },
      { description: "x".repeat(2001) },
      { contact_email: "invalid" },
      { application_url: "javascript:alert(1)" },
      { application_url: "ftp://example.org/file" },
    ]) {
      expect(opportunityEditSchema.safeParse({ ...data, ...patch }).success).toBe(false);
    }
    expect(
      opportunityEditSchema.parse({ ...data, application_url: "", contact_email: "" })
        .application_url,
    ).toBe("");
  });
});
