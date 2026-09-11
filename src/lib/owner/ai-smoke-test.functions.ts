import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildOwnerAiSmokePrompt, OWNER_AI_SMOKE_MODEL } from "@/lib/owner/ai-smoke-test";

const SmokeResponseSchema = z.object({
  status: z.literal("ok"),
});

type AdminLookupClient = {
  from: (table: string) => {
    select: (columns: string) => AdminRoleQuery;
  };
};

type AdminRoleQuery = {
  eq: (column: string, value: string) => AdminRoleQuery;
  maybeSingle: () => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export type OwnerAiSmokeTestResult = {
  ok: true;
  model: string;
  redactionCount: number;
  latencyMs: number;
  checkedAt: string;
  persistedRecords: 0;
};

async function requirePlatformOwner(client: AdminLookupClient, userId: string) {
  const { data, error } = await client
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "platform_owner")
    .maybeSingle();

  if (error) throw new Error("Could not verify Owner Admin access.");
  if (!data) {
    throw new Error(
      "TransitionForward platform owner access is required to run the Lovable AI smoke test.",
    );
  }
}

/**
 * Explicit, owner-only live probe. It has no inputs and performs no database
 * writes. The only outbound content is a fixed fictional sample after it has
 * passed through the same redaction layer used by sensitive document flows.
 */
export const runOwnerAiSmokeTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerAiSmokeTestResult> => {
    const userId = (context as { userId: string }).userId;
    const client = (context as { supabase: unknown }).supabase as AdminLookupClient;
    await requirePlatformOwner(client, userId);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI is not configured in this server environment.");

    const { prompt, redactionCount } = buildOwnerAiSmokePrompt();
    const gateway = createLovableAiGatewayProvider(apiKey);
    const startedAt = Date.now();

    try {
      const { experimental_output } = await generateText({
        model: gateway(OWNER_AI_SMOKE_MODEL),
        experimental_output: Output.object({ schema: SmokeResponseSchema }),
        prompt,
        abortSignal: AbortSignal.timeout(20_000),
      });

      SmokeResponseSchema.parse(experimental_output);

      return {
        ok: true,
        model: OWNER_AI_SMOKE_MODEL,
        redactionCount,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        persistedRecords: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/401|403|unauthoriz|forbidden/i.test(message)) {
        throw new Error("Lovable AI rejected the managed server credential.");
      }
      if (/402|credit|quota/i.test(message)) {
        throw new Error("Lovable AI could not run because project AI credits are unavailable.");
      }
      if (/429|rate.?limit/i.test(message)) {
        throw new Error("Lovable AI is temporarily rate limited. Do not retry automatically.");
      }
      throw new Error("Lovable AI did not complete the synthetic smoke test.");
    }
  });
