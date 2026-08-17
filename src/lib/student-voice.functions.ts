import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentVoiceResponse = {
  id: string;
  student_id: string;
  prompt_key: string;
  response_text: string;
  age_band: string | null;
  updated_at: string;
};

export const getStudentVoiceResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("student_voice_responses")
      .select("id,student_id,prompt_key,response_text,age_band,updated_at")
      .eq("student_id", data.studentId);
    if (error) {
      console.error("getStudentVoiceResponses failed", error);
      return { responses: [] as StudentVoiceResponse[] };
    }
    return { responses: (rows ?? []) as StudentVoiceResponse[] };
  });

export const upsertStudentVoiceResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        studentId: z.string().uuid(),
        promptKey: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/),
        responseText: z.string().trim().max(4000),
        ageBand: z.string().trim().max(32).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("student_voice_responses")
      .upsert(
        {
          student_id: data.studentId,
          prompt_key: data.promptKey,
          response_text: data.responseText,
          age_band: data.ageBand ?? null,
          created_by: userId,
        },
        { onConflict: "student_id,prompt_key" },
      );
    if (error) {
      console.error("upsertStudentVoiceResponse failed", error);
      throw new Error("Could not save your answer. Please try again.");
    }
    return { ok: true as const };
  });
