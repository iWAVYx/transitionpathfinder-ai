import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  gateway: vi.fn(() => vi.fn(() => "test-model")),
}));
vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  generateText: mocks.generate,
  Output: { object: (value: unknown) => value },
}));
vi.mock("../../src/lib/ai-gateway.server", () => ({
  createLovableAiGatewayProvider: mocks.gateway,
}));
import { generateIntakeReport } from "../../src/lib/pathway-generation.server";
import { IntakeSchema, buildPrompt } from "../../src/lib/pathway-generation-contract";
import { mergePathwayIntake, createPathwayIntakeDefaults } from "../../src/lib/pathway-intake";
const input = IntakeSchema.parse(
  mergePathwayIntake({
    ...createPathwayIntakeDefaults(),
    student_first_name: "Sample",
    assistive_technology: "Screen reader",
    information_to_verify: "Confirm transport",
  }),
);
beforeEach(() => vi.clearAllMocks());
it("keeps structured builder context in the shared generation prompt", () => {
  expect(buildPrompt(input)).toContain("Screen reader");
  expect(buildPrompt(input)).toContain("Confirm transport");
});
it("rejects missing configuration before contacting the provider", async () => {
  await expect(generateIntakeReport(input, "")).rejects.toThrow("not configured");
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("rejects malformed provider output instead of treating it as a report", async () => {
  mocks.generate.mockResolvedValue({ experimental_output: { unsupported: "content" } });
  await expect(generateIntakeReport(input, "test-only")).rejects.toThrow();
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: buildPrompt(input),
      system: expect.stringContaining('"career_pathways"'),
    }),
  );
  const system = mocks.generate.mock.calls[0][0].system;
  const schema = JSON.parse(system.slice(system.indexOf("\n") + 1));
  expect(schema.properties.thirty_day_plan.minItems).toBe(4);
  expect(schema.properties.iep_translator.minItems).toBe(1);
  expect(schema.properties.iep_translator.items.properties.connected_services.maxItems).toBe(4);
  expect(schema.properties.iep_translator.items.properties.connected_services.minItems).toBeUndefined();
  expect(schema.required).not.toContain("iep_translator");
  expect(schema.properties.iep_translator.description).toContain("Omit this section");
  expect(schema.properties.confidence_level.enum).toEqual(["low", "moderate", "high"]);
  expect(system).not.toContain("Screen reader");
});
it("rejects invalid intake before contacting the provider", async () => {
  await expect(
    generateIntakeReport({ ...input, student_first_name: "" }, "test-only"),
  ).rejects.toThrow();
  expect(mocks.generate).not.toHaveBeenCalled();
});
