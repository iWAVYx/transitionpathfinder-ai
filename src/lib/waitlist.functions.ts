import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const WaitlistSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1).max(200),
  role: z.enum([
    "family",
    "parent",
    "student",
    "educator",
    "administrator",
    "district",
    "partner",
    "other",
  ]),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  student_grade_band: z
    .enum(["9-10", "11-12", "post-secondary", "not-applicable"])
    .optional()
    .or(z.literal("")),
  reason: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.string().trim().max(100).optional().or(z.literal("")),
});

export const submitWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => WaitlistSchema.parse(input))
  .handler(async ({ data }) => {
    // Use the anon/publishable client so this public endpoint is gated by
    // the waitlist table's INSERT RLS policy, not the service-role key.
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await anonClient.from("waitlist").insert({
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      state: data.state || null,
      student_grade_band: data.student_grade_band || null,
      reason: data.reason || null,
      source: data.source || "marketing-site",
    });

    if (error) {
      console.error("waitlist insert failed", error);
      throw new Error("Could not save your submission. Please try again.");
    }

    return { ok: true };
  });
