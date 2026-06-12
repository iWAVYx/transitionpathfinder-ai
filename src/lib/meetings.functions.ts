import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MEETING_KINDS = ["PPT", "IEP", "transition", "other"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export type Meeting = {
  id: string;
  student_id: string;
  created_by: string;
  kind: MeetingKind;
  title: string;
  scheduled_at: string | null;
  location: string | null;
  status: "upcoming" | "completed" | "cancelled";
  student_voice: string | null;
  family_concerns: string | null;
  teacher_notes: string | null;
  summary: string | null;
  decisions: string | null;
  documents_to_update: string | null;
  next_meeting_date: string | null;
  created_at: string;
  updated_at: string;
};

export type AgendaItem = {
  id: string;
  meeting_id: string;
  position: number;
  title: string;
  notes: string | null;
};

export type MeetingQuestion = {
  id: string;
  meeting_id: string;
  asker_role: string;
  asker_id: string | null;
  question: string;
  answer: string | null;
  created_at: string;
};

export type ActionItem = {
  id: string;
  meeting_id: string;
  title: string;
  assignee_role: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: "open" | "in-progress" | "done";
  created_at: string;
  updated_at: string;
};

export const listMeetings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ student_id: z.string().uuid().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: false, nullsFirst: false });
    if (data.student_id) q = q.eq("student_id", data.student_id);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listMeetings failed", error);
      return { meetings: [] as Meeting[] };
    }
    return { meetings: (rows ?? []) as Meeting[] };
  });

export const getMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [m, agenda, qs, actions] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("meeting_agenda_items")
        .select("*")
        .eq("meeting_id", data.id)
        .order("position", { ascending: true }),
      supabase
        .from("meeting_questions")
        .select("*")
        .eq("meeting_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("meeting_action_items")
        .select("*")
        .eq("meeting_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (m.error || !m.data) throw new Error("Meeting not found.");
    return {
      meeting: m.data as Meeting,
      agenda: (agenda.data ?? []) as AgendaItem[],
      questions: (qs.data ?? []) as MeetingQuestion[],
      actions: (actions.data ?? []) as ActionItem[],
    };
  });

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        kind: z.enum(MEETING_KINDS).default("PPT"),
        title: z.string().trim().min(1).max(200),
        scheduled_at: z.string().datetime().optional(),
        location: z.string().trim().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("meetings")
      .insert({
        student_id: data.student_id,
        created_by: userId,
        kind: data.kind,
        title: data.title,
        scheduled_at: data.scheduled_at ?? null,
        location: data.location ?? null,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createMeeting failed", error);
      throw new Error("Could not create meeting.");
    }
    await supabase.from("feed_events").insert({
      student_id: data.student_id,
      actor_id: userId,
      kind: "meeting.scheduled",
      title: `Meeting scheduled: ${data.title}`,
      body: data.scheduled_at ? `Scheduled for ${data.scheduled_at}` : null,
      ref_table: "meetings",
      ref_id: row.id,
    });
    // Seed a default agenda
    const defaults = [
      "Welcome and introductions",
      "Student strengths and progress",
      "Family hopes and concerns",
      "Goal updates",
      "Postsecondary planning",
      "Action items and next steps",
    ];
    await supabase
      .from("meeting_agenda_items")
      .insert(defaults.map((t, i) => ({ meeting_id: row.id, position: i, title: t })));
    return row as Meeting;
  });

export const updateMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        student_voice: z.string().max(4000).optional(),
        family_concerns: z.string().max(4000).optional(),
        teacher_notes: z.string().max(4000).optional(),
        summary: z.string().max(8000).optional(),
        status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
        scheduled_at: z.string().datetime().optional(),
        location: z.string().max(200).optional(),
        title: z.string().min(1).max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const { error } = await supabase.from("meetings").update(rest).eq("id", id);
    if (error) throw new Error("Could not update meeting.");
    return { ok: true };
  });

export const addAgendaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        meeting_id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        notes: z.string().max(2000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: max } = await supabase
      .from("meeting_agenda_items")
      .select("position")
      .eq("meeting_id", data.meeting_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (max?.position ?? -1) + 1;
    const { error } = await supabase
      .from("meeting_agenda_items")
      .insert({ meeting_id: data.meeting_id, position, title: data.title, notes: data.notes ?? null });
    if (error) throw new Error("Could not add agenda item.");
    return { ok: true };
  });

export const addQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        meeting_id: z.string().uuid(),
        asker_role: z.enum(["family", "student", "educator", "team"]).default("family"),
        question: z.string().trim().min(1).max(800),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("meeting_questions")
      .insert({
        meeting_id: data.meeting_id,
        asker_role: data.asker_role,
        asker_id: userId,
        question: data.question,
      });
    if (error) throw new Error("Could not add question.");
    return { ok: true };
  });

export const addActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        meeting_id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        assignee_role: z.string().max(40).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("meeting_action_items").insert({
      meeting_id: data.meeting_id,
      title: data.title,
      assignee_role: data.assignee_role ?? null,
      due_date: data.due_date ?? null,
    });
    if (error) throw new Error("Could not add action item.");
    return { ok: true };
  });

export const setActionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in-progress", "done"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("meeting_action_items")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update action.");
    return { ok: true };
  });
