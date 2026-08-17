import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TrustStudentSummary = {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  is_owner: boolean;
  collaborators: Array<{
    id: string;
    email: string;
    role: "viewer" | "editor";
    status: "pending" | "accepted" | "revoked";
    created_at: string;
  }>;
  share_tokens: Array<{
    id: string;
    token: string;
    audience: string;
    expires_at: string | null;
    revoked: boolean;
    view_count: number;
    last_viewed_at: string | null;
    created_at: string;
    report_id: string;
  }>;
  consents: Array<{
    id: string;
    consent_type: string;
    consent_status: string;
    granted_at: string;
    revoked_at: string | null;
  }>;
};

export const getTrustOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Students the user can access (RLS handles scope)
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, owner_id")
      .order("created_at", { ascending: false });

    const studentIds = (students ?? []).map((s) => s.id);
    if (studentIds.length === 0) return { students: [] as TrustStudentSummary[] };

    const [collabsRes, sharesRes, consentsRes, reportsRes] = await Promise.all([
      supabase.from("student_collaborators").select("*").in("student_id", studentIds),
      supabase.from("pathway_reports").select("id, student_id").in("student_id", studentIds),
      supabase.from("consent_records").select("*").in("student_id", studentIds),
      supabase.from("pathway_reports").select("id, student_id").in("student_id", studentIds),
    ]);

    const reportToStudent = new Map<string, string>();
    (reportsRes.data ?? []).forEach((r: any) => reportToStudent.set(r.id, r.student_id));

    const reportIds = Array.from(reportToStudent.keys());
    let sharesByStudent: Record<string, any[]> = {};
    if (reportIds.length > 0) {
      const { data: shareTokens } = await supabase
        .from("share_tokens")
        .select("*")
        .in("report_id", reportIds);
      (shareTokens ?? []).forEach((st: any) => {
        const sid = reportToStudent.get(st.report_id);
        if (!sid) return;
        (sharesByStudent[sid] ||= []).push(st);
      });
    }

    const summary: TrustStudentSummary[] = (students ?? []).map((s: any) => ({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      is_owner: s.owner_id === userId,
      collaborators: (collabsRes.data ?? [])
        .filter((c: any) => c.student_id === s.id)
        .map((c: any) => ({
          id: c.id,
          email: c.invited_email,
          role: c.role,
          status: c.status,
          created_at: c.created_at,
        })),
      share_tokens: (sharesByStudent[s.id] ?? []).map((st: any) => ({
        id: st.id,
        token: st.token,
        audience: st.audience,
        expires_at: st.expires_at,
        revoked: st.revoked,
        view_count: st.view_count,
        last_viewed_at: st.last_viewed_at,
        created_at: st.created_at,
        report_id: st.report_id,
      })),
      consents: (consentsRes.data ?? [])
        .filter((c: any) => c.student_id === s.id)
        .map((c: any) => ({
          id: c.id,
          consent_type: c.consent_type,
          consent_status: c.consent_status,
          granted_at: c.granted_at,
          revoked_at: c.revoked_at,
        })),
    }));

    return { students: summary };
  });

export const revokeShareToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("share_tokens")
      .update({ revoked: true })
      .eq("id", data.id);
    if (error) throw new Error("Could not revoke share link.");
    return { ok: true };
  });

export const revokeConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("consent_records")
      .update({ consent_status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error("Could not revoke consent.");
    return { ok: true };
  });
