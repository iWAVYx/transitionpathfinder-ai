import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CaseloadStudent = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade_band: string | null;
  school: string | null;
  photo_url: string | null;
  relationship: "owner" | "editor" | "viewer";
  open_action_items: number;
  goal_count: number;
  last_note_at: string | null;
  latest_report_id: string | null;
  next_meeting_at: string | null;
  next_meeting_id: string | null;
  next_meeting_title: string | null;
};

export const getCaseload = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Owned students
    const { data: owned } = await supabase
      .from("students")
      .select("id, first_name, last_name, grade_band, school, photo_url")
      .eq("owner_id", userId);

    // Collaborator entries (auto-accept any pending we own)
    await supabase
      .from("student_collaborators")
      .update({ status: "accepted" })
      .eq("user_id", userId)
      .eq("status", "pending");

    const { data: collabs } = await supabase
      .from("student_collaborators")
      .select("role, status, students:student_id (id, first_name, last_name, grade_band, school, photo_url)")
      .eq("user_id", userId)
      .eq("status", "accepted");

    const map = new Map<string, CaseloadStudent>();

    for (const s of owned ?? []) {
      map.set(s.id, {
        ...s,
        relationship: "owner",
        open_action_items: 0,
        goal_count: 0,
        last_note_at: null,
        latest_report_id: null,
        next_meeting_at: null,
        next_meeting_id: null,
        next_meeting_title: null,
      });
    }
    for (const c of collabs ?? []) {
      const s = (c as any).students;
      if (!s || map.has(s.id)) continue;
      map.set(s.id, {
        ...s,
        relationship: c.role === "editor" ? "editor" : "viewer",
        open_action_items: 0,
        goal_count: 0,
        last_note_at: null,
        latest_report_id: null,
        next_meeting_at: null,
        next_meeting_id: null,
        next_meeting_title: null,
      });
    }

    const ids = Array.from(map.keys());
    if (ids.length === 0) return { students: [] as CaseloadStudent[] };

    const nowIso = new Date().toISOString();
    const [{ data: actions }, { data: goals }, { data: notes }, { data: reports }, { data: meetings }] = await Promise.all([
      supabase.from("action_items").select("student_id, status").in("student_id", ids),
      supabase.from("goals").select("student_id").in("student_id", ids),
      supabase.from("collaboration_notes").select("student_id, created_at").in("student_id", ids).order("created_at", { ascending: false }),
      supabase.from("pathway_reports").select("id, student_id, created_at").in("student_id", ids).order("created_at", { ascending: false }),
      supabase
        .from("meetings")
        .select("id, student_id, title, scheduled_at, status")
        .in("student_id", ids)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
    ]);

    for (const a of actions ?? []) {
      if (!a.student_id) continue;
      const row = map.get(a.student_id);
      if (row && a.status !== "complete") row.open_action_items += 1;
    }
    for (const g of goals ?? []) {
      if (!g.student_id) continue;
      const row = map.get(g.student_id);
      if (row) row.goal_count += 1;
    }
    for (const n of notes ?? []) {
      if (!n.student_id) continue;
      const row = map.get(n.student_id);
      if (row && !row.last_note_at) row.last_note_at = n.created_at;
    }
    for (const r of reports ?? []) {
      if (!r.student_id) continue;
      const row = map.get(r.student_id);
      if (row && !row.latest_report_id) row.latest_report_id = r.id;
    }
    for (const m of meetings ?? []) {
      if (!m.student_id || !m.scheduled_at) continue;
      if (m.status === "cancelled") continue;
      const row = map.get(m.student_id);
      if (row && !row.next_meeting_at) {
        row.next_meeting_at = m.scheduled_at;
        row.next_meeting_id = m.id;
        row.next_meeting_title = m.title ?? null;
      }
    }

    return { students: Array.from(map.values()) };
  });

export const addCaseManagerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        content: z.string().trim().min(1).max(4000),
        visibility: z.enum(["team", "family", "private"]).default("team"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const note_type = data.visibility === "private" ? "private_note" : "teacher_note";
    const { data: row, error } = await supabase
      .from("collaboration_notes")
      .insert({
        student_id: data.student_id,
        created_by_user_id: userId,
        note_type,
        visibility: data.visibility,
        content: data.content,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("addCaseManagerNote failed", error);
      throw new Error("Could not save note.");
    }
    return row;
  });

export const listStudentNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("collaboration_notes")
      .select("id, content, note_type, visibility, created_at, created_by_user_id")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(50);
    return { notes: rows ?? [] };
  });

export const quickAssignActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        category: z.enum(["family", "student", "teacher", "school", "partner"]).default("teacher"),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("action_items")
      .insert({
        student_id: data.student_id,
        created_by_user_id: userId,
        title: data.title,
        category: data.category,
        priority: data.priority,
        due_date: data.due_date ?? null,
        status: "not_started",
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("quickAssignActionItem failed", error);
      throw new Error("Could not create action item.");
    }
    return row;
  });
