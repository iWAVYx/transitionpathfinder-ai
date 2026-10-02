import { ReportSchema } from "./pathway-generation-contract";

/** Metadata only: never log provider text, intake values, or validation messages. */
export function pathwayGenerationDiagnostics(error: unknown) {
  const sections = new Set<string>();
  const codes = new Set<string>();
  const allowedCodes = new Set(["invalid_type", "too_small", "too_big", "invalid_value", "invalid_enum_value", "invalid_union", "unrecognized_keys", "custom"]);
  const allowedReasons = new Set(["stop", "length", "content-filter", "tool-calls", "error", "other", "unknown"]);
  let finishReason = "unknown";
  let current = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 6 && current && typeof current === "object" && !seen.has(current); depth++) {
    seen.add(current);
    const item = current as { cause?: unknown; finishReason?: unknown; issues?: unknown };
    if (typeof item.finishReason === "string" && allowedReasons.has(item.finishReason)) finishReason = item.finishReason;
    if (Array.isArray(item.issues)) {
      for (const issue of item.issues.slice(0, 100)) {
        if (!issue || typeof issue !== "object") continue;
        if (typeof issue.code === "string" && allowedCodes.has(issue.code)) codes.add(issue.code);
        const section = Array.isArray(issue.path) ? issue.path[0] : undefined;
        if (typeof section === "string" && Object.prototype.hasOwnProperty.call(ReportSchema.shape, section)) sections.add(section);
      }
    }
    current = item.cause;
  }
  return { finishReason, sections: [...sections].sort(), validationCodes: [...codes].sort() };
}
