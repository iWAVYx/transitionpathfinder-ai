import { it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b: any = {
      middleware: () => b,
      validator: (p: any) => {
        parse = p;
        return b;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
import { completeOnboarding, saveOnboardingProgress } from "../../src/lib/profile.functions";
const actor = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
function context(fail?: string) {
  const roleSave = vi.fn(async () => ({ error: fail === "assign" ? {} : null }));
  return {
    userId: actor,
    supabase: {
      rpc: vi.fn(async () => ({ data: null, error: null })),
      from: vi.fn((table: string) =>
        table === "profiles"
          ? { upsert: vi.fn(async () => ({ error: null })) }
          : {
              delete: () => ({
                eq: () => ({ in: async () => ({ error: fail === "clear" ? {} : null }) }),
              }),
              upsert: roleSave,
            },
      ),
    },
    roleSave,
  };
}
for (const fn of [completeOnboarding, saveOnboardingProgress])
  it("onboarding rejects account changes before writes", async () => {
    const c = context();
    await expect(
      (fn as any)({
        data: { expected_viewer_id: other, primary_role: "parent", first_name: "Fictional" },
        context: c,
      }),
    ).rejects.toThrow("sign-in changed");
    expect(c.supabase.from).not.toHaveBeenCalled();
    expect(c.supabase.rpc).not.toHaveBeenCalled();
  });
for (const fail of ["clear", "assign"])
  it("does not acknowledge completion after " + fail + " role failure", async () => {
    const c = context(fail);
    await expect(
      (completeOnboarding as any)({
        data: { expected_viewer_id: actor, primary_role: "parent", first_name: "Fictional" },
        context: c,
      }),
    ).rejects.toThrow("could not finish");
  });
