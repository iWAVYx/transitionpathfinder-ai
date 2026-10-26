import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), gateway: vi.fn(), key: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async (input: { data: unknown; context?: unknown }) => fn({ data: validate(input.data), context: input.context ?? { userId: "synthetic-caller" } }) };
  return builder;
} }));
vi.mock("ai", async (original) => ({
  ...await original<typeof import("ai")>(),
  generateText: mocks.generate,
  Output: { object: ({ schema }: any) => schema },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: mocks.key }));
import { translateReport, suggestNextSteps } from "../../src/lib/ai-assist.functions";
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
  const system = mocks.generate.mock.calls[0][0].system;
  expect(system).toContain("Translate every supplied text item; retain its numeric id");
  expect(system).toContain("Keep proper names, numbers, dates, citations and URLs");
  expect(system).not.toContain(source.summary);
  expect(system).not.toContain("private-identifier");
  const schema = JSON.parse(system.split("\n").at(-1));
  expect(schema.required).toEqual(["translations"]);
  expect(schema.properties.translations.maxItems).toBe(1500);
  expect(schema.properties.translations.items.required).toEqual(["id", "text"]);
  expect(schema.properties.translations.items.properties.id.minimum).toBe(0);
  expect(schema.properties.translations.items.properties.text.minLength).toBe(1);
  expect(schema.additionalProperties).toBe(false);
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

it.each([translateReport, suggestNextSteps])("rejects a departed viewer before provider setup", async fn => {
  await expect((fn as any)({ data: { report: DEMO_STUDENTS.maya.report, student_first_name: "Maya", language: "spanish", expected_viewer_id: "departed-viewer" }, context: { userId: "current-viewer" } })).rejects.toThrow("sign-in changed");
  expect(mocks.key).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it.each([{}, { ...DEMO_STUDENTS.maya.report, summary: "Large text ".repeat(15000) }])("rejects unusable next-step context before looking up credentials", async report => {
  await expect((suggestNextSteps as any)({ data: { student_first_name: "Maya", report } })).rejects.toThrow(/not ready|too long/);
  expect(mocks.key).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it("keeps complete context and shared evidence rules for next-step suggestions", async () => {
  const output = { this_week: ["Review available data.", "Ask what information is needed."], this_month: ["Discuss options together.", "Confirm a proposed next step."], conversation_starters: ["What have we recorded?", "What should we try?"], watch_for: ["Note the support conditions."] };
  mocks.generate.mockResolvedValue({ experimental_output: output });
  const report = { ...DEMO_STUDENTS.maya.report, summary: "Reported context. ".repeat(160) + "Final source condition: two independent steps, proposed goal four." };
  const result = await (suggestNextSteps as any)({ data: { student_first_name: "Maya", report, expected_viewer_id: "synthetic-caller" } });
  expect(result.next_steps).toEqual(output);
  const request = mocks.generate.mock.calls[0][0]; expect(request.prompt).toContain(report.summary); expect(request.prompt).not.toContain("synthetic-caller");
  expect(request.system).toContain("not a measured result"); expect(request.system).toContain("invent firsthand experience, progress trends"); expect(mocks.generate).toHaveBeenCalledTimes(1);
});
it("rejects blank suggested actions and omits private provider detail from logs", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.generate.mockRejectedValueOnce(new Error("PRIVATE provider content"));
  await expect((suggestNextSteps as any)({ data: { student_first_name: "Maya", report: DEMO_STUDENTS.maya.report } })).rejects.toThrow("couldn't generate next steps");
  expect(log.mock.calls.flat().join(" ")).not.toContain("PRIVATE provider content");
  mocks.generate.mockResolvedValueOnce({ experimental_output: { this_week: ["  ", "Review"], this_month: ["Review", "Discuss"], conversation_starters: ["Ask", "Listen"], watch_for: ["Observe"] } });
  await expect((suggestNextSteps as any)({ data: { student_first_name: "Maya", report: DEMO_STUDENTS.maya.report } })).rejects.toThrow("couldn't generate next steps");
});
