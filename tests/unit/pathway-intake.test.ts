import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PATHWAY_ENGINE_CONTEXT_FIELDS,
  PathwayIntakeFormSchema,
  createPathwayIntakeDefaults,
  mergePathwayIntake,
} from "@/lib/pathway-intake";

describe("live Pathway intake", () => {
  it("collects and forwards every richer planning field consumed by the engine", () => {
    const raw = {
      ...createPathwayIntakeDefaults(),
      student_first_name: "  Jordan  ",
      communication_prefs: "  Written steps before meetings  ",
      transportation_needs: "  Evening bus route  ",
      family_priorities: "  Paid work and safe community access  ",
      family_concerns_extended: "  Adult-service handoff is unclear  ",
      student_worries: "  Making phone calls  ",
      services_received: "  Weekly job coaching  ",
      desired_postsecondary_outcomes: "  Culinary certificate and paid work  ",
      upcoming_meetings: "  Annual PPT on October 18  ",
    };

    const parsed = PathwayIntakeFormSchema.parse(raw);
    const payload = mergePathwayIntake(parsed) as Record<string, unknown>;

    expect(PATHWAY_ENGINE_CONTEXT_FIELDS).toHaveLength(8);
    for (const field of PATHWAY_ENGINE_CONTEXT_FIELDS) {
      expect(payload[field], field).toBe(parsed[field]);
      expect(payload[field], field).not.toBe("");
    }
    expect(payload.student_first_name).toBe("Jordan");
  });

  it("preserves structured goals, needs, and observations in the existing report inputs", () => {
    const parsed = PathwayIntakeFormSchema.parse({
      ...createPathwayIntakeDefaults(),
      student_first_name: "Jordan",
      current_goals: "Use a weekly schedule independently.",
      career_goals: "Try food-service work.",
      education_goals: "Explore a culinary certificate.",
      needs: "Needs support initiating unfamiliar tasks.",
      life_skills: "Plan and shop for one meal.",
      educator_input: "Benefits from modeled examples.",
      teacher_observations: "Leads preparation during cooking class.",
    });

    const payload = mergePathwayIntake(parsed);

    expect(payload.current_goals).toContain("Use a weekly schedule independently.");
    expect(payload.current_goals).toContain("Career goals: Try food-service work.");
    expect(payload.current_goals).toContain(
      "Education / training goals: Explore a culinary certificate.",
    );
    expect(payload.needs).toContain("Life-skills needs: Plan and shop for one meal.");
    expect(payload.educator_input).toContain(
      "Teacher observations: Leads preparation during cooking class.",
    );
  });

  it("keeps richer fields bounded before they can reach persistence or AI generation", () => {
    const result = PathwayIntakeFormSchema.safeParse({
      ...createPathwayIntakeDefaults(),
      student_first_name: "Jordan",
      upcoming_meetings: "x".repeat(1001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "upcoming_meetings")).toBe(true);
    }
  });

  it("keeps every richer field connected from the visible form through persistence and generation", () => {
    const root = resolve(__dirname, "../..");
    const route = readFileSync(resolve(root, "src/routes/_authenticated/pathway.tsx"), "utf8");
    const server = readFileSync(resolve(root, "src/lib/pathway.functions.ts"), "utf8");

    for (const field of PATHWAY_ENGINE_CONTEXT_FIELDS) {
      expect(route, `${field} visible form control`).toContain(`form.register("${field}")`);
      expect(server, `${field} persistence`).toContain(`${field}: data.${field} || null`);
      expect(server, `${field} report generation`).toContain(`intake.${field}`);
    }
  });
});
