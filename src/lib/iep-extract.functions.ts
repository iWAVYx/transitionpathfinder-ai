import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  text: z.string().trim().min(40, "Not enough text to read from.").max(120_000),
});

const ExtractSchema = z.object({
  student_first_name: z.string().default(""),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable", ""]).default(""),
  strengths: z.string().default(""),
  interests: z.string().default(""),
  needs: z.string().default(""),
  supports: z.string().default(""),
  transportation: z.string().default(""),
  communication: z.string().default(""),
  current_goals: z.string().default(""),
  family_concerns: z.string().default(""),
  student_voice: z.string().default(""),
  educator_input: z.string().default(""),
});

export type IepExtract = z.infer<typeof ExtractSchema>;

export const extractFromIep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are a careful reader of Individualized Education Programs (IEPs) and transition plans in the United States, especially Connecticut. Read the document text below and extract structured fields for a TransitionForward intake.

Rules:
- Use plain, warm, family-friendly language. Rewrite clinical jargon into clear sentences.
- Use ONLY the student's first name. Never include last names, addresses, school names, dates of birth, or any other identifying detail.
- If something is not in the text, leave that field as an empty string. Do not guess.
- "current_goals" = transition / post-secondary IEP goals only, summarized as short bullet-style sentences separated by newlines.
- "grade_band" must be exactly one of: "9-10", "11-12", "post-secondary", "not-applicable", or "" if unclear.
- Keep each field under ~1500 characters.

IEP TEXT:
"""
${data.text.slice(0, 100_000)}
"""`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: ExtractSchema }),
        prompt,
      });
      return { extract: experimental_output as IepExtract };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("IEP extract failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't read this IEP. Try pasting the text directly.");
    }
  });
