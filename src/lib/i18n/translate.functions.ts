// Batch text-translation server function backed by Lovable AI Gateway.
// Translates an array of English strings into the requested locale and
// returns them in the same order. Used by the client-side DOM translator.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranslateInput = z.object({
  locale: z.string().min(2).max(8),
  texts: z.array(z.string().min(1).max(2000)).min(1).max(80),
});

const LANG_NAMES: Record<string, string> = {
  es: "Spanish (Latin American)",
  pt: "Portuguese (Brazilian)",
  ht: "Haitian Creole",
};

type GatewayMessage = { role: "system" | "user"; content: string };

async function callGateway(messages: GatewayMessage[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
    }),
  });

  if (res.status === 429) throw new Error("Translation rate limit reached. Try again shortly.");
  if (res.status === 402) throw new Error("Translation credits exhausted. Add credits to continue.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Translation gateway error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export const translateBatch = createServerFn({ method: "POST" })
  .validator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    const { locale, texts } = data;
    if (locale === "en") return { translations: texts };

    const targetName = LANG_NAMES[locale] ?? locale;
    const system =
      "You are a professional translator for a special-education web app. " +
      `Translate each English string to ${targetName}. ` +
      "Preserve meaning, tone, punctuation, capitalization style, leading/trailing whitespace, " +
      "emoji, numbers, and any HTML or template placeholders like {name} or %s exactly. " +
      "Do NOT translate brand names: TransitionForward, IEP, PPT, Lovable. " +
      "Return ONLY a JSON object: {\"t\":[\"...\",\"...\"]} with one translation per input, " +
      "in the same order, same length array. No prose, no markdown.";

    const user = JSON.stringify({ inputs: texts });
    const content = await callGateway([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    // Strip optional code fences then parse.
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: { t?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fall back to first {...} block.
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Translator returned non-JSON output");
      parsed = JSON.parse(m[0]);
    }

    const arr = Array.isArray(parsed.t) ? parsed.t : null;
    if (!arr || arr.length !== texts.length) {
      throw new Error("Translator returned mismatched array length");
    }

    return {
      translations: arr.map((v, i) => (typeof v === "string" ? v : texts[i])),
    };
  });
