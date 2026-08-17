import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MESSAGE_CATEGORIES = [
  "goal-updates",
  "meeting-prep",
  "family-questions",
  "student-reflections",
  "resource-questions",
  "follow-up-actions",
  "general",
] as const;
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<MessageCategory, string> = {
  "goal-updates": "Goal updates",
  "meeting-prep": "Meeting prep",
  "family-questions": "Family questions",
  "student-reflections": "Student reflections",
  "resource-questions": "Resource questions",
  "follow-up-actions": "Follow-up actions",
  general: "General",
};

export type MessageThread = {
  id: string;
  student_id: string;
  category: MessageCategory;
  subject: string;
  status: "open" | "resolved";
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  attachments: any;
  created_at: string;
  updated_at: string;
};

export const listThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("message_threads")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (data.student_id) q = q.eq("student_id", data.student_id);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listThreads failed", error);
      return { threads: [] as MessageThread[] };
    }
    return { threads: (rows ?? []) as MessageThread[] };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        category: z.enum(MESSAGE_CATEGORIES),
        subject: z.string().trim().min(1).max(200),
        first_message: z.string().trim().min(1).max(4000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread, error } = await supabase
      .from("message_threads")
      .insert({
        student_id: data.student_id,
        category: data.category,
        subject: data.subject,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error || !thread) {
      console.error("createThread failed", error);
      throw new Error("Could not start thread.");
    }
    const { error: msgErr } = await supabase.from("messages").insert({
      thread_id: thread.id,
      author_id: userId,
      body: data.first_message,
    });
    if (msgErr) {
      console.error("createThread first message failed", msgErr);
    }
    await supabase.from("feed_events").insert({
      student_id: data.student_id,
      actor_id: userId,
      kind: "message.posted",
      title: `New message: ${data.subject}`,
      body: data.first_message.slice(0, 240),
      ref_table: "message_threads",
      ref_id: thread.id,
      payload: { category: data.category },
    });
    return thread as MessageThread;
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ thread_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", data.thread_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listMessages failed", error);
      return { messages: [] as Message[] };
    }
    return { messages: (rows ?? []) as Message[] };
  });

export const postMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        thread_id: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({ thread_id: data.thread_id, author_id: userId, body: data.body })
      .select("*")
      .single();
    if (error || !msg) {
      console.error("postMessage failed", error);
      throw new Error("Could not send.");
    }
    await supabase
      .from("message_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.thread_id);
    return msg as Message;
  });

export const setThreadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "resolved"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("message_threads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Could not update thread.");
    return { ok: true };
  });
