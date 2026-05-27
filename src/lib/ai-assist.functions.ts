import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { PathwayReport } from "./pathway.functions";

const LANGUAGES = [
  "spanish",
  "portuguese",
  "haitian-creole",
  "french",
  "arabic",
  "simplified-chinese",
  "vietnamese",
  "polish",
] as const;
export type SupportedLanguage = (typeof LANGUAGES)[number];

const LanguageLabel: Record<SupportedLanguage, string> = {
  spanish: "Spanish (Español)",
  portuguese: "Portuguese (Português)",
  "haitian-creole": "Haitian Creole (Kreyòl ayisyen)",
  french: "French (Français)",
  arabic: "Arabic (العربية)",
  "simplified-chinese": "Simplified Chinese (简体中文)",
  vietnamese: "Vietnamese (Tiếng Việt)",
  polish: "Polish (Polski)",
};

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => ({
  value: l,
  label: LanguageLabel[l],
}));

function aiKey() {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured.");
  return apiKey;
}

function rethrowFriendly(err: unknown, fallback: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(fallback, msg);
  if (msg.includes("429"))
    throw new Error("The AI is busy right now. Please try again in a moment.");
  if (msg.includes("402"))
    throw new Error("AI usage limit reached. Please add credits to continue.");
  throw new Error(fallback);
}

/* ---------- Translate report ---------- */

export const translateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      report: z.unknown(),
      language: z.enum(LANGUAGES),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const gateway = createLovableAiGatewayProvider(aiKey());
    const langLabel = LanguageLabel[data.language];

    const prompt = `Translate the following TransitionForward Pathway Report into ${langLabel}. Preserve the exact JSON shape and keys. Translate ALL human-readable text values into ${langLabel} using warm, plain, family-friendly language at roughly a 7th-grade reading level. Do NOT translate field keys. Keep proper names unchanged. Keep numbers (like week numbers) unchanged.

REPORT JSON:
${JSON.stringify(data.report)}`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        prompt,
      });
      // Try to extract JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("translation_no_json");
      const translated = JSON.parse(match[0]) as PathwayReport;
      return { report: translated, language: data.language };
    } catch (err) {
      rethrowFriendly(err, "We couldn't translate this report. Please try again.");
    }
  });

/* ---------- Suggest next steps ---------- */

const NextStepsSchema = z.object({
  this_week: z.array(z.string()).min(2).max(5),
  this_month: z.array(z.string()).min(2).max(5),
  conversation_starters: z.array(z.string()).min(2).max(4),
  watch_for: z.array(z.string()).min(1).max(4),
});
export type NextSteps = z.infer<typeof NextStepsSchema>;

export const suggestNextSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      student_first_name: z.string().trim().min(1).max(80),
      report: z.unknown(),
      recent_notes: z.string().trim().max(4000).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const gateway = createLovableAiGatewayProvider(aiKey());
    const prompt = `You are TransitionForward, a warm guide for families and educators planning life after high school. Based on this Pathway Report for ${data.student_first_name}, suggest the most useful next steps to take RIGHT NOW. Be specific, gentle, and realistic — small concrete actions, not abstract advice.

Recent family/educator notes: ${data.recent_notes || "(none yet)"}

REPORT:
${JSON.stringify(data.report)}`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: NextStepsSchema }),
        prompt,
      });
      return { next_steps: experimental_output as NextSteps };
    } catch (err) {
      rethrowFriendly(err, "We couldn't generate next steps right now.");
    }
  });
