import { afterEach, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const b = { middleware: () => b, handler: (fn: any) => fn };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { runSystemHealth } from "../../src/lib/owner/system-health.functions";
function database(
  admin: unknown = { user_id: "synthetic-owner" },
  partnerResult = { count: 0 as number | null, error: null as { message: string } | null },
) {
  const mutations = vi.fn(() => {
    throw new Error("No mutation permitted in read-only diagnostics");
  });
  const fetcher = vi.fn(
    async () => new Response('<meta name="viewport" content="width=device-width">'),
  );
  vi.stubGlobal("fetch", fetcher);
  const from = vi.fn((table: string) => {
    let selectedColumns = "*";
    const q: any = {
      select: vi.fn((columns: string) => { selectedColumns = columns; return q; }),
      eq: vi.fn(() => q),
      maybeSingle: vi.fn(async () => ({ data: admin, error: null })),
      then: (resolve: any, reject: any) =>
        Promise.resolve(
          table === "partner_organizations"
            ? selectedColumns === "*"
              ? { count: null, error: { message: "permission denied for restricted partner columns" } }
              : partnerResult :
          table === "organizations" ? { count: null, error: { message: "Not the partner directory" } } :
          { count: 1, error: null },
        ).then(resolve, reject),
      update: mutations,
      insert: mutations,
      delete: mutations,
      upsert: mutations,
    };
    return q;
  });
  const rpc = vi.fn(async (name: string) => ({
    data: name === "audience_for_role" ? "family" : true,
    error: null,
  }));
  const client = {
    from,
    rpc,
    storage: { from: vi.fn(() => ({ list: vi.fn(async () => ({ error: null })) })) },
  };
  return {
    context: { userId: "synthetic-owner", supabase: client },
    from,
    rpc,
    mutations,
    fetcher,
  };
}
afterEach(() => vi.unstubAllGlobals());
it("loading health is read-only and never contacts another deployment", async () => {
  const db = database();
  const result = await (runSystemHealth as any)({ context: db.context });
  expect(db.mutations).not.toHaveBeenCalled();
  expect(db.fetcher).not.toHaveBeenCalled();
  expect(
    db.rpc.mock.calls.every(([name]) =>
      ["has_role", "audience_for_role", "can_access_student"].includes(name),
    ),
  ).toBe(true);
  expect(result.results.find((x: any) => x.key === "privilege_escalation_guard").status).toBe(
    "manual",
  );
  expect(result.results.find((x: any) => x.key === "mobile_responsiveness").status).toBe("manual");
  expect(result.results.find((x: any) => x.key === "privilege_escalation_guard").detail).toContain(
    "No role updates",
  );
});
it("denies a non-admin before diagnostics or any mutation", async () => {
  const db = database(null);
  await expect((runSystemHealth as any)({ context: db.context })).rejects.toThrow(
    "admin access required",
  );
  expect(db.from).toHaveBeenCalledTimes(1);
  expect(db.rpc).not.toHaveBeenCalled();
  expect(db.mutations).not.toHaveBeenCalled();
  expect(db.fetcher).not.toHaveBeenCalled();
});

it.each([
  { count: 0, error: null, status: "working", detail: "0 rows reachable" },
  { count: null, error: { message: "permission denied" }, status: "attention", detail: "permission denied" },
  { count: null, error: { message: "" }, status: "attention", detail: "Could not read partner_organizations" },
])("reports directory connectivity honestly for $detail", async ({ count, error, status, detail }) => {
  const db = database(undefined, { count, error });
  const result = await (runSystemHealth as any)({ context: db.context });
  const directory = result.results.find((x: any) => x.key === "partner_directory");
  expect(directory.status).toBe(status);
  expect(directory.detail).toContain(detail);
  expect(db.from).not.toHaveBeenCalledWith("organizations");
  expect(db.mutations).not.toHaveBeenCalled();
  if (error) expect(directory.fixes.join(" ")).toContain("partner_organizations");
});

it("counts the directory without requesting protected contact columns", async () => {
  const db = database();
  const result = await (runSystemHealth as any)({ context: db.context });
  expect(result.results.find((x: any) => x.key === "partner_directory")).toMatchObject({
    status: "working", detail: "0 rows reachable",
  });
  const partnerIndex = db.from.mock.calls.findIndex(([table]) => table === "partner_organizations");
  const partnerQuery = db.from.mock.results[partnerIndex].value;
  expect(partnerQuery.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  expect(db.mutations).not.toHaveBeenCalled();
});
