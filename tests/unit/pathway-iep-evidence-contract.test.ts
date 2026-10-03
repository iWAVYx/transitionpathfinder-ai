import { describe, expect, it } from "vitest";
import { IntakeSchema, ReportSchema, buildPrompt } from "../../src/lib/pathway-generation-contract";

const translation = {
  goal_text: "Supplied IEP goal: follow a familiar four-step routine using a visual checklist.",
  plain_meaning: "Use a picture checklist to practice a familiar routine.",
  connected_services: [],
  questions_to_ask: ["What is the baseline and how will prompts be counted?"],
  what_student_should_know: "Ask the team which supports are available.",
  connected_to_real_life: "Practice a familiar snack routine.",
  missing_information: ["Baseline and documented services"],
};
const iepSection = ReportSchema.pick({ iep_translator: true });

describe("evidence-bound IEP translation contract", () => {
  it("permits omission when no actual IEP goal was supplied", () => {
    expect(iepSection.parse({})).toEqual({});
    expect(iepSection.safeParse({ iep_translator: [] }).success).toBe(false);
  });
  it("permits one supplied goal without inventing a service", () => {
    expect(iepSection.parse({ iep_translator: [translation] }).iep_translator).toEqual([
      translation,
    ]);
  });
  it("retains content shape, question requirements, and array maximums", () => {
    for (const invalid of [
      { ...translation, goal_text: undefined },
      { ...translation, goal_text: " " },
      { ...translation, connected_services: [" "] },
      { ...translation, questions_to_ask: [" "] },
      { ...translation, questions_to_ask: [] },
      { ...translation, connected_services: Array(5).fill("Service") },
      { ...translation, missing_information: Array(5).fill("Unknown") },
    ]) {
      expect(iepSection.safeParse({ iep_translator: [invalid] }).success).toBe(false);
    }
    expect(iepSection.safeParse({ iep_translator: Array(7).fill(translation) }).success).toBe(
      false,
    );
  });
  it("instructs generation to separate absent evidence and draft ideas from an actual IEP", () => {
    const prompt = buildPrompt(
      IntakeSchema.parse({
        submitter_role: "family",
        student_first_name: "Synthetic",
        current_goals: "No actual IEP supplied. Draft planning idea only.",
      }),
    );
    expect(prompt).toContain("Fill every required top-level field");
    expect(prompt).toContain("If no actual IEP goal text was supplied, omit this optional section");
    expect(prompt).toContain("If exactly one actual goal was supplied, return one translation");
    expect(prompt).toContain("Never invent or duplicate goals or services to fill an array");
    expect(prompt).not.toContain("Fill in EVERY top-level field");
  });
});
