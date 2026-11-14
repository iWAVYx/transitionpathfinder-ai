import { expect, it, vi } from "vitest";
const router = vi.hoisted(() => ({ redirect: vi.fn((options: unknown) => ({ redirect: options })) }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => options, redirect: router.redirect }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { let validate = (v: any) => v; const b: any = { middleware: () => b, validator: (fn: any) => { validate = fn; return b; }, handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }) }; return b; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { seedDemoStudent } from "@/lib/golden-path.functions";
import { Route } from "@/routes/_authenticated/demo-mode";
const message = "The sample workspace has moved. Open Demo Mode to explore it without changing your account.";
it.each(["parent", "student", "educator", "partner", "school_admin", "district_admin", "admin", "platform_owner", "platform_admin", "content_manager", "support_admin"])("refuses the cached sample writer for %s before touching any database, file or provider", async (role) => {
  const access = vi.fn(() => { throw new Error("Unexpected external access"); });
  const supabase = new Proxy({}, { get: access });
  await expect(seedDemoStudent({ data: { expected_viewer_id: "caller" }, context: { userId: "caller", claims: { sub: "caller", role: "authenticated" }, roles: [role], supabase } } as any)).rejects.toThrow(message);
  expect(access).not.toHaveBeenCalled();
});
it("also refuses older calls without viewer intent and never synthesizes consent or a sample record", async () => {
  const access = vi.fn(); await expect(seedDemoStudent({ context: { userId: "caller", supabase: new Proxy({}, { get: access }) } } as any)).rejects.toThrow(message); expect(access).not.toHaveBeenCalled();
});
it("preserves viewer mismatch refusal before retired endpoint handling", async () => {
  await expect(seedDemoStudent({ data: { expected_viewer_id: "another" }, context: { userId: "caller" } } as any)).rejects.toThrow("Your sign-in changed");
});
it("replaces the legacy demo bookmark with the shared role chooser without any loaders or writes", () => {
  const beforeLoad = (Route as any).beforeLoad; expect(() => beforeLoad()).toThrow();
  expect(router.redirect).toHaveBeenCalledWith({ to: "/demo", replace: true });
  expect((Route as any).loader).toBeUndefined(); expect((Route as any).component).toBeUndefined();
});
