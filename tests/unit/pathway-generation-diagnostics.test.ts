import { expect, it } from "vitest";
import { pathwayGenerationDiagnostics } from "../../src/lib/pathway-generation-diagnostics";

it("extracts schema section and finish metadata without exposing model or student data", () => {
  const result = pathwayGenerationDiagnostics({
    text: "PRIVATE MODEL OUTPUT", finishReason: "stop",
    cause: { value: "PRIVATE INTAKE", cause: { issues: [
      { code: "too_small", path: ["career_pathways", 0, "PRIVATE KEY"], message: "PRIVATE VALUE" },
      { code: "PRIVATE CODE", path: ["PRIVATE FIELD"] },
    ] } },
  });
  expect(result).toEqual({ finishReason: "stop", sections: ["career_pathways"], validationCodes: ["too_small"] });
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});

it("handles unknown errors and circular causes without exposing arbitrary strings", () => {
  const error: { cause?: unknown; finishReason: string } = { finishReason: "PRIVATE" };
  error.cause = error;
  expect(pathwayGenerationDiagnostics(error)).toEqual({ finishReason: "unknown", sections: [], validationCodes: [] });
  expect(pathwayGenerationDiagnostics(null).sections).toEqual([]);
});
