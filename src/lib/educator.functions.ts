import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StudentRef = { id: string; first_name: string; last_name: string | null };

async function loadCaseloadIds(
  supabase: any,
  userId: string,
): Promise<{ ids: string[]; byId: Map<string, StudentRef> }> {
  const [{ data: owned }, { data: collabs }] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("owner_id", userId),
    supabase
      .from("student_collaborators")
      .select(
        "students:student_id (id, first_name, last_name)",
      )
      .eq("user_id", userId)
      .eq("status", "accepted"),
  ]);
  const byId = new Map<string, StudentRef>();
  for (const s of (owned ?? []) as StudentRef[]) byId.set(s.id, s);
  for (const c of collabs ?? []) {
    const s = (c as { students: StudentRef | null }).students;
    if (s && !byId.has(s.id)) byId.set(s.id, s);
  }
  return { ids: Array.from(byId.keys()), byId };
}

/* ---------- READINESS GAPS ---------- */

export type CaseloadReadinessRow = {
  student_id: string;
  student_name: string;
  employment: number | null;
  education: number | null;
  independent_living: number | null;
  self_advocacy: number | null;
  overall: number | null;
  gap_pillar: string | null;
};

export const listCaseloadReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { ids, byId } = await loadCaseloadIds(supabase, userId);
    if (ids.length === 0)
      return { rows: [] as CaseloadReadinessRow[] };

    const { data: scores } = await supabase
      .from("readiness_scores")
      .select("student_id, category, score, updated_at")
      .in("student_id", ids);

    type Score = {
      student_id: string;
      category: string;
      score: number;
      updated_at: string;
    };
    const bucket = new Map<string, Record<string, number>>();
    for (const s of (scores ?? []) as Score[]) {
      if (!bucket.has(s.student_id)) bucket.set(s.student_id, {});
      const cur = bucket.get(s.student_id)!;
      // keep latest per category
      cur[s.category] = s.score;
    }

    const rows: CaseloadReadinessRow[] = ids.map((id) => {
      const s = byId.get(id)!;
      const b = bucket.get(id) ?? {};
      const emp = b.employment ?? null;
      const edu = b.education ?? null;
      const ilv = b.independent_living ?? null;
      const adv = b.self_advocacy ?? null;
      const vals = [emp, edu, ilv, adv].filter(
        (v): v is number => typeof v === "number",
      );
      const overall = vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;
      const pillars: Array<[string, number | null]> = [
        ["employment", emp],
        ["education", edu],
        ["independent_living", ilv],
        ["self_advocacy", adv],
      ];
      const scored = pillars.filter(
        (p): p is [string, number] => typeof p[1] === "number",
      );
      const gap = scored.length
        ? scored.reduce((lo, cur) => (cur[1] < lo[1] ? cur : lo))[0]
        : null;
      return {
        student_id: id,
        student_name: `${s.first_name}${s.last_name ? ` ${s.last_name}` : ""}`,
        employment: emp,
        education: edu,
        independent_living: ilv,
        self_advocacy: adv,
        overall,
        gap_pillar: gap,
      };
    });
    // Lowest overall first, unscored last
    rows.sort((a, b) => {
      if (a.overall == null && b.overall == null) return 0;
      if (a.overall == null) return 1;
      if (b.overall == null) return -1;
      return a.overall - b.overall;
    });
    return { rows };
  });

/* ---------- CASELOAD NOTES ---------- */

export type CaseloadNoteRow = {
  id: string;
  student_id: string;
  student_name: string;
  content: string;
  note_type: string;
  visibility: string;
  created_at: string;
};

export const listCaseloadNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { ids, byId } = await loadCaseloadIds(supabase, userId);
    if (ids.length === 0) return { notes: [] as CaseloadNoteRow[] };

    const { data: notes } = await supabase
      .from("collaboration_notes")
      .select("id, student_id, content, note_type, visibility, created_at")
      .in("student_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    type Row = {
      id: string;
      student_id: string;
      content: string;
      note_type: string;
      visibility: string;
      created_at: string;
    };
    return {
      notes: ((notes ?? []) as Row[]).map((n) => {
        const s = byId.get(n.student_id);
        return {
          ...n,
          student_name: s
            ? `${s.first_name}${s.last_name ? ` ${s.last_name}` : ""}`
            : "Unknown",
        };
      }),
    };
  });

/* ---------- CASELOAD ACTION ITEMS ---------- */

export type CaseloadActionRow = {
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  priority: string;
  due_date: string | null;
  created_at: string;
};

export const listCaseloadActionItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { ids, byId } = await loadCaseloadIds(supabase, userId);
    if (ids.length === 0) return { items: [] as CaseloadActionRow[] };

    const { data: items } = await supabase
      .from("action_items")
      .select(
        "id, student_id, title, description, status, category, priority, due_date, created_at",
      )
      .in("student_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    type Row = {
      id: string;
      student_id: string;
      title: string;
      description: string | null;
      status: string;
      category: string;
      priority: string;
      due_date: string | null;
      created_at: string;
    };
    return {
      items: ((items ?? []) as Row[]).map((it) => {
        const s = byId.get(it.student_id);
        return {
          ...it,
          student_name: s
            ? `${s.first_name}${s.last_name ? ` ${s.last_name}` : ""}`
            : "Unknown",
        };
      }),
    };
  });
