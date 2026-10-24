import { z } from "zod";

const Check = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["working", "attention", "manual", "coming_soon"]),
  detail: z.string(),
  error: z.string().nullable().optional(),
  fixes: z.array(z.string()).optional(),
  category: z.enum(["data", "people", "ops", "ui", "infra"]),
});
const SystemHealthResult = z.object({
  results: z.array(Check),
  summary: z.object({
    working: z.number().int().nonnegative(),
    attention: z.number().int().nonnegative(),
    manual: z.number().int().nonnegative(),
    coming_soon: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    checked_at: z.string().datetime(),
  }),
});

/** Invalid/old responses must reach recovery UI, not crash status rendering. */
export function parseSystemHealthResult(input: unknown) {
  return SystemHealthResult.parse(input);
}
