import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), gateway: vi.fn(), key: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async (input: { data: unknown }) => fn({ data: validate(input.data) }) };
  return builder;
} }));
vi.mock("ai", () => ({ generateText: mocks.generate, Output: { object: ({ schema }: any) => schema } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: mocks.key }));
import { translateReport } from "../../src/lib/ai-assist.functions";
import { DEMO_STUDENTS } from "../../src/lib/demo-data";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "synthetic-key"); mocks.key.mockReturnValue(mocks.gateway); mocks.gateway.mockReturnValue("synthetic-model"); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const call = (report: unknown) => (translateReport as any)({ data: { report, language: "spanish" } });
it("sends numbered text items only and rebuilds a complete report from a mocked structured response", async () => {
  mocks.generate.mockImplementation(async ({ prompt }: any) => {
    const payload = JSON.parse(prompt.split("<<<DOCUMENT TEXT>>>\n")[1].split("\n<<<END DOCUMENT TEXT>>>")[0]);
    expect(payload[0]).toHaveProperty("id", 0);
    expect(prompt).not.toContain("private-identifier");
    return { experimental_output: { translations: payload.map((item: any) => ({ id: item.id, text: `Translated: ${item.text}` })) } };
  });
  const source = { ...DEMO_STUDENTS.maya.report, unknown_private_id: "private-identifier" };
  const result = await call(source);
  expect(result.report.summary).toBe(`Translated: ${source.summary}`);
  expect(result.report.unknown_private_id).toBe("private-identifier");
  expect(result.report.thirty_day_plan[0].week).toBe(1);
  expect(result.language).toBe("spanish");
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});
it("does not call or configure a provider for unsupported report content", async () => {
  await expect(call({ summary: "Incomplete report" })).rejects.toThrow("not ready for translation");
  expect(mocks.key).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it("rejects a partial provider result without returning a report", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.generate.mockResolvedValue({ experimental_output: { translations: [] } });
  await expect(call(DEMO_STUDENTS.maya.report)).rejects.toThrow("couldn't translate the complete report");
  log.mockRestore();
});
