import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FeedEvent = {
  id: string;
  student_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  ref_table: string | null;
  ref_id: string | null;
  payload: any;
  created_at: string;
};

export const FEED_KINDS = [
  "report.generated",
  "goal.added",
  "goal.status_changed",
  "reflection.added",
  "progress_note.added",
  "meeting.scheduled",
  "meeting.summary_exported",
  "form.completed",
  "resource.matched",
  "document.uploaded",
  "message.posted",
] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

const EmitInput = z.object({
  student_id: z.string().uuid(),
  kind: z.enum(FEED_KINDS),
  title: z.string().min(1).max(240),
  body: z.string().max(2000).optional(),
  ref_table: z.string().max(80).optional(),
  ref_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export const emitFeedEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EmitInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("feed_events").insert({
      student_id: data.student_id,
      actor_id: userId,
      kind: data.kind,
      title: data.title,
      body: data.body ?? null,
      ref_table: data.ref_table ?? null,
      ref_id: data.ref_id ?? null,
      payload: (data.payload ?? {}) as any,
    });
    if (error) {
      console.error("emitFeedEvent failed", error);
      throw new Error("Could not record event.");
    }
    return { ok: true };
  });

export const listFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("feed_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.student_id) q = q.eq("student_id", data.student_id);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listFeed failed", error);
      return { events: [] as FeedEvent[] };
    }
    return { events: (rows ?? []) as unknown as FeedEvent[] };
  });
