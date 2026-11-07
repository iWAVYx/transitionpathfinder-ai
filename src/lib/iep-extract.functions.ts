import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";
import { buildStructuredOutputSystem } from "@/lib/structured-output-system";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { redactSensitiveText } from "./sensitive-text-redaction";
import { PLANNING_SOURCE_GROUNDING } from "./planning-source-grounding";

const InputSchema = z.object({
  ...viewerIntentSchema.shape,
  text: z.string().trim().min(40, "Not enough text to read from.").max(120_000),
});

const ExtractSchema = z.object({
  student_first_name: z.string().trim().max(80).default(""),
  grade_band: z.enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable", ""]).default(""),
  strengths: z.string().trim().max(1500).default(""),
  interests: z.string().trim().max(1500).default(""),
  needs: z.string().trim().max(1500).default(""),
  supports: z.string().trim().max(1500).default(""),
  transportation: z.string().trim().max(1500).default(""),
  communication: z.string().trim().max(1500).default(""),
  current_goals: z.string().trim().max(1500).default(""),
  family_concerns: z.string().trim().max(1500).default(""),
  student_voice: z.string().trim().max(1500).default(""),
  educator_input: z.string().trim().max(1500).default(""),
  assistive_technology: z.string().trim().max(1500).default(""),
  accommodations: z.string().trim().max(1500).default(""),
  services_received: z.string().trim().max(1500).default(""),
  readiness_evidence: z.string().trim().max(1500).default(""),
  evidence_source_dates: z.string().trim().max(1500).default(""),
});

export type IepExtract = z.infer<typeof ExtractSchema>;

export const extractFromIep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const privacySafeText = redactSensitiveText(data.text).text;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are a careful reader of Individualized Education Programs (IEPs) and transition plans in the United States, especially Connecticut. Read the document text below and extract structured fields for a TransitionForward intake.

Rules:
- Use plain, warm, family-friendly language. Rewrite clinical jargon into clear sentences.
- Use ONLY the student's first name. Never include last names, addresses, school names, dates of birth, or any other identifying detail.
- If something is not in the text, leave that field as an empty string. Do not guess.
- "current_goals" = transition / post-secondary IEP goals only, summarized as short bullet-style sentences separated by newlines.
- "assistive_technology" = devices, software, AAC, accessibility features, and any AT evaluation need explicitly stated in the text.
- "accommodations" = accommodations explicitly documented in the source; do not infer new accommodations.
- "services_received" = current related, school, vocational, clinical, or community services explicitly documented.
- "readiness_evidence" = measurable transition-readiness performance, including prompting or conditions when stated.
- "evidence_source_dates" = source labels and dates that are safe after redaction; omit identifying names and exact birth dates.
- "grade_band" must be exactly one of: "6-8", "9-10", "11-12", "post-secondary", "not-applicable", or "" if unclear.
- Keep each narrative field at most 1500 characters and the first name at most 80 characters.
- Preserve recorded baseline numbers, units, dates and prompting conditions. Distinguish a proposed target from a measured result or adopted goal; do not turn a reported observation into verified progress.

IEP TEXT:
"""
${privacySafeText}
"""`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: ExtractSchema }),
        system: await buildStructuredOutputSystem(ExtractSchema, PLANNING_SOURCE_GROUNDING),
        prompt,
      });
      return { extract: ExtractSchema.parse(experimental_output) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Provider/schema errors can include private document text.
      console.error("IEP extraction failed.");
      if (msg.includes("429"))
        throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402"))
        throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't read this IEP. Try pasting the text directly.");
    }
  });
