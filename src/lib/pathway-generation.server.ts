import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  IntakeSchema,
  ReportSchema,
  buildPrompt,
  type IntakeInput,
  type PathwayReport,
} from "./pathway-generation-contract";

export const INTAKE_REPORT_MODEL = "google/gemini-2.5-pro";

/** Generates validated content only. Authentication and persistence belong to callers. */
export async function generateIntakeReport(
  input: IntakeInput,
  apiKey: string,
): Promise<PathwayReport> {
  if (!apiKey) throw new Error("AI service is not configured.");
  const data = IntakeSchema.parse(input);
  const gateway = createLovableAiGatewayProvider(apiKey);
  const { experimental_output } = await generateText({
    model: gateway(INTAKE_REPORT_MODEL),
    experimental_output: Output.object({ schema: ReportSchema }),
    prompt: buildPrompt(data),
  });
  return ReportSchema.parse(experimental_output);
}
