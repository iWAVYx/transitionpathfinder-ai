import { z } from "zod";
import { ReportSchema } from "./pathway-generation-contract";
import { pathwayGenerationDiagnostics } from "./pathway-generation-diagnostics";

const marker = "\n[TF_PATHWAY_FAILURE_V1]";
const sectionNames = new Set(Object.keys(ReportSchema.shape));
const codes = ["invalid_type", "too_small", "too_big", "invalid_value", "invalid_enum_value", "invalid_union", "unrecognized_keys", "custom"] as const;
const metadataSchema = z.object({
  stage: z.enum(["intake_save", "generation", "validation", "report_save", "response_confirmation"]),
  finishReason: z.enum(["stop", "length", "content-filter", "tool-calls", "error", "other", "unknown"]),
  sections: z.array(z.string().refine(value => sectionNames.has(value))).max(16),
  validationCodes: z.array(z.enum(codes)).max(8),
  statusCode: z.number().int().min(400).max(599).optional(),
  databaseCode: z.string().regex(/^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/).optional(),
}).strict();
export type PathwayCreationFailure = z.infer<typeof metadataSchema>;

function message(metadata: PathwayCreationFailure) {
  if (metadata.stage === "intake_save") return "Could not save your intake. Please try again.";
  if (metadata.stage === "report_save") return "Generated the report but couldn't save it. Please try again.";
  if (metadata.stage === "response_confirmation") return "We couldn't confirm that your report was completed. Check your saved reports before trying again.";
  if (metadata.statusCode === 429) return "The AI is busy right now. Please try again in a moment.";
  if (metadata.statusCode === 402) return "AI usage limit reached. Please add credits to continue.";
  return "We couldn't generate the Pathway Report. Please try again.";
}

/** Only fixed categories and bounded codes cross the framework's message-only error transport. */
export function pathwayCreationFailure(stage: "intake_save" | "generation" | "report_save" | "response_confirmation", error: unknown) {
  const diagnostic = stage === "generation" ? pathwayGenerationDiagnostics(error) : { finishReason: "unknown", sections: [], validationCodes: [] };
  let statusCode: number | undefined;
  let invalidOutput = diagnostic.validationCodes.length > 0;
  let current = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 6 && current && typeof current === "object" && !seen.has(current); depth++) {
    seen.add(current);
    const item = current as { name?: unknown; statusCode?: unknown; cause?: unknown };
    if (typeof item.statusCode === "number" && Number.isInteger(item.statusCode) && item.statusCode >= 400 && item.statusCode <= 599) statusCode ??= item.statusCode;
    if (typeof item.name === "string" && ["ZodError", "AI_NoObjectGeneratedError", "AI_TypeValidationError", "AI_JSONParseError"].includes(item.name)) invalidOutput = true;
    current = item.cause;
  }
  const rawCode = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
  const databaseCode = (stage === "intake_save" || stage === "report_save") && typeof rawCode === "string" && /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(rawCode) ? rawCode : undefined;
  const metadata = metadataSchema.parse({
    stage: stage === "generation" && invalidOutput ? "validation" : stage,
    finishReason: diagnostic.finishReason,
    sections: diagnostic.sections.slice(0,16),
    validationCodes: diagnostic.validationCodes.slice(0,8),
    ...(stage === "generation" && statusCode !== undefined ? { statusCode } : {}),
    ...(databaseCode ? { databaseCode } : {}),
  });
  return new Error(message(metadata) + marker + JSON.stringify(metadata));
}

export function parsePathwayCreationFailureMetadata(value: unknown): PathwayCreationFailure | null {
  const parsed = metadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Unknown or tampered packets remain unknown; never return arbitrary message/body properties. */
export function readPathwayCreationFailure(error: unknown): PathwayCreationFailure | null {
  if (!(error instanceof Error) || error.message.length > 4096) return null;
  const at = error.message.indexOf(marker);
  if (at < 0) return null;
  try {
    const parsed = parsePathwayCreationFailureMetadata(JSON.parse(error.message.slice(at + marker.length)));
    return parsed && error.message.slice(0,at) === message(parsed) ? parsed : null;
  } catch { return null; }
}
