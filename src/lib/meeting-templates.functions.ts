import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ageFromDob,
  transitionBand,
  type TransitionBand,
} from "@/lib/transition-age";

export type MeetingTemplate = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  recommended_band: string | null;
  created_by: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type MeetingTemplateItem = {
  id: string;
  template_id: string;
  position: number;
  title: string;
  notes: string | null;
  links_to: "custom" | "goal" | "compliance";
  compliance_key: string | null;
};

const LinksTo = z.enum(["custom", "goal", "compliance"]);

export const listMeetingTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meeting_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { templates: (data ?? []) as MeetingTemplate[] };
  });

export const getMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const [t, items] = await Promise.all([
      context.supabase.from("meeting_templates").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("meeting_template_items")
        .select("*")
        .eq("template_id", data.id)
        .order("position", { ascending: true }),
    ]);
    if (t.error || !t.data) throw new Error("Template not found.");
    return {
      template: t.data as MeetingTemplate,
      items: (items.data ?? []) as MeetingTemplateItem[],
    };
  });

export const createMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().max(2000).optional().nullable(),
        kind: z.string().min(1).max(40).default("PPT"),
        recommended_band: z.string().max(40).optional().nullable(),
        is_shared: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meeting_templates")
      .insert({
        name: data.name,
        description: data.description ?? null,
        kind: data.kind,
        recommended_band: data.recommended_band ?? null,
        is_shared: data.is_shared,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { template: row as MeetingTemplate };
  });

export const updateMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        description: z.string().max(2000).nullable().optional(),
        kind: z.string().min(1).max(40).optional(),
        recommended_band: z.string().max(40).nullable().optional(),
        is_shared: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("meeting_templates").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meeting_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const upsertTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        template_id: z.string().uuid(),
        position: z.number().int().min(0).max(500).optional(),
        title: z.string().trim().min(1).max(240),
        notes: z.string().max(2000).nullable().optional(),
        links_to: LinksTo.default("custom"),
        compliance_key: z.string().max(80).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      template_id: data.template_id,
      title: data.title,
      notes: data.notes ?? null,
      links_to: data.links_to,
      compliance_key: data.compliance_key ?? null,
      ...(data.position !== undefined ? { position: data.position } : {}),
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("meeting_template_items")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    // Append to the end
    const { count } = await context.supabase
      .from("meeting_template_items")
      .select("id", { count: "exact", head: true })
      .eq("template_id", data.template_id);
    const { error } = await context.supabase.from("meeting_template_items").insert({
      ...payload,
      position: data.position ?? count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meeting_template_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Compliance milestones (mirrors teacher-portal logic, keyed for linkage)
function complianceForBand(band: TransitionBand, age: number | null) {
  const out: { key: string; title: string; notes: string }[] = [];
  if (age != null && age >= 13 && age < 14) {
    out.push({
      key: "ct_age_14_planning",
      title: "Confirm transition planning is in the next IEP (CT age 14)",
      notes:
        "Connecticut requires transition planning in the first IEP in effect when the student turns 14.",
    });
  }
  if (age != null && age >= 17 && age < 18) {
    out.push({
      key: "ct_age_17_notice",
      title: "Document written notice of transfer of rights at age 18",
      notes:
        "Provide written notice to student and parent at least one year before age 18.",
    });
  }
  if (age != null && age >= 18) {
    out.push({
      key: "ct_age_18_decision_making",
      title: "Confirm adult decision-making arrangement",
      notes:
        "Document supported decision-making, POA, or guardianship status. Rights have transferred to the student.",
    });
  }
  if (band === "exit_year") {
    out.push({
      key: "ct_exit_summary",
      title: "Prepare Summary of Performance and adult-service handoff",
      notes:
        "Wrap up agency connections, postsecondary plan, and documentation the student will need after exit.",
    });
  }
  return out;
}

export const applyMeetingTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        meeting_id: z.string().uuid(),
        template_id: z.string().uuid(),
        include_goals: z.boolean().default(true),
        include_compliance: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: meeting, error: mErr } = await supabase
      .from("meetings")
      .select("id, student_id")
      .eq("id", data.meeting_id)
      .maybeSingle();
    if (mErr || !meeting) throw new Error("Meeting not found.");

    const [{ data: tplItems, error: tiErr }, { data: existing }] = await Promise.all([
      supabase
        .from("meeting_template_items")
        .select("*")
        .eq("template_id", data.template_id)
        .order("position", { ascending: true }),
      supabase
        .from("meeting_agenda_items")
        .select("position")
        .eq("meeting_id", data.meeting_id)
        .order("position", { ascending: false })
        .limit(1),
    ]);
    if (tiErr) throw new Error(tiErr.message);

    let nextPos = (existing?.[0]?.position ?? -1) + 1;
    const rows: Array<{
      meeting_id: string;
      position: number;
      title: string;
      notes: string | null;
      linked_goal_id: string | null;
      linked_compliance_key: string | null;
      template_id: string;
    }> = [];

    for (const it of tplItems ?? []) {
      rows.push({
        meeting_id: data.meeting_id,
        position: nextPos++,
        title: it.title,
        notes: it.notes,
        linked_goal_id: null,
        linked_compliance_key: it.links_to === "compliance" ? it.compliance_key : null,
        template_id: data.template_id,
      });
    }

    let goalsAdded = 0;
    let complianceAdded = 0;

    if (data.include_goals) {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, title, target_date, status")
        .eq("student_id", meeting.student_id)
        .neq("status", "met")
        .order("target_date", { ascending: true, nullsFirst: false })
        .limit(20);
      for (const g of goals ?? []) {
        rows.push({
          meeting_id: data.meeting_id,
          position: nextPos++,
          title: `Goal review: ${g.title}`,
          notes: g.target_date ? `Target date ${g.target_date}` : null,
          linked_goal_id: g.id,
          linked_compliance_key: null,
          template_id: data.template_id,
        });
        goalsAdded++;
      }
    }

    if (data.include_compliance) {
      const { data: student } = await supabase
        .from("students")
        .select("date_of_birth, grade_band")
        .eq("id", meeting.student_id)
        .maybeSingle();
      const age = ageFromDob(student?.date_of_birth);
      const band = transitionBand(age, student?.grade_band);
      for (const c of complianceForBand(band, age)) {
        rows.push({
          meeting_id: data.meeting_id,
          position: nextPos++,
          title: c.title,
          notes: c.notes,
          linked_goal_id: null,
          linked_compliance_key: c.key,
          template_id: data.template_id,
        });
        complianceAdded++;
      }
    }

    if (rows.length === 0) {
      return { inserted: 0, goalsAdded, complianceAdded };
    }
    const { error: insErr } = await supabase.from("meeting_agenda_items").insert(rows);
    if (insErr) throw new Error(insErr.message);
    return { inserted: rows.length, goalsAdded, complianceAdded };
  });

export const setAgendaItemCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meeting_agenda_items")
      .update({ completed: data.completed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateAgendaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(240).optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("meeting_agenda_items")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteAgendaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meeting_agenda_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
