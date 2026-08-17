import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StudentKey = z.enum(["maya", "jordan"]);

const MinuteEntrySchema = z.object({
  topic: z.string().max(500),
  decision: z.string().max(2000),
  owner: z.string().max(200),
  followUp: z.string().max(2000).optional(),
});

const MinutesSchema = z.object({
  date: z.string().max(100),
  attendees: z.array(z.string().max(200)).max(50),
  entries: z.array(MinuteEntrySchema).max(50),
});

const AgendaLinkSchema = z.object({
  agendaItem: z.string().max(500),
  reportSection: z.string().max(500),
  rationale: z.string().max(2000),
});

const PayloadSchema = z.object({
  student_key: StudentKey,
  minutes: MinutesSchema,
  agenda: z.array(AgendaLinkSchema).max(50),
});

export const getDemoMeetingEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ student_key: StudentKey }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("demo_meeting_edits")
      .select("minutes, agenda, updated_at")
      .eq("user_id", userId)
      .eq("student_key", data.student_key)
      .maybeSingle();
    if (error) {
      console.error("getDemoMeetingEdits failed", error);
      throw new Error("Could not load demo edits.");
    }
    return row ?? null;
  });

export const saveDemoMeetingEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => PayloadSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("demo_meeting_edits").upsert(
      {
        user_id: userId,
        student_key: data.student_key,
        minutes: data.minutes,
        agenda: data.agenda,
      },
      { onConflict: "user_id,student_key" },
    );
    if (error) {
      console.error("saveDemoMeetingEdits failed", error);
      throw new Error("Could not save demo edits.");
    }
    return { ok: true };
  });

export const resetDemoMeetingEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ student_key: StudentKey }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("demo_meeting_edits")
      .delete()
      .eq("user_id", userId)
      .eq("student_key", data.student_key);
    if (error) {
      console.error("resetDemoMeetingEdits failed", error);
      throw new Error("Could not reset demo edits.");
    }
    return { ok: true };
  });
