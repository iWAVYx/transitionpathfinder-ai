import { expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (v: unknown) => v;
  const builder = { middleware: () => builder, validator: (fn: typeof parse) => { parse = fn; return builder; }, handler: (fn: any) => ({ data, context }: any) => fn({ data: parse(data), context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("ai", async original => ({ ...await original<typeof import("ai")>(), generateText: api.generate }));
import { generateReadinessInsights } from "@/lib/readiness-insights.functions";
it("rejects departed viewer intent before querying student data or calling AI", async () => {
  const from = vi.fn();
  await expect((generateReadinessInsights as any)({ data: { student_id: "11111111-1111-4111-8111-111111111111", expected_viewer_id: "old-viewer" }, context: { userId: "new-viewer", supabase: { from } } })).rejects.toThrow("sign-in changed");
  expect(from).not.toHaveBeenCalled(); expect(api.generate).not.toHaveBeenCalled();
});
