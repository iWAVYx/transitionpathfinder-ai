import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only.");
}

export type PartnerApplication = {
  id: string;
  email: string;
  full_name: string;
  state: string | null;
  reason: string | null;
  created_at: string;
};

export const listPartnerApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, email, full_name, state, reason, created_at")
      .eq("role", "partner")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listPartnerApplications failed", error);
      return { applications: [] as PartnerApplication[] };
    }
    return { applications: (data ?? []) as PartnerApplication[] };
  });

export const decidePartnerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    // Pull the entry so we can log it before removing
    const { data: entry } = await supabase
      .from("waitlist")
      .select("id, email, full_name, role")
      .eq("id", data.id)
      .maybeSingle();

    if (!entry) throw new Error("Application not found.");

    const { error: delErr } = await supabase
      .from("waitlist")
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);

    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: `partner.${data.decision}`,
      entity_type: "waitlist",
      entity_id: data.id,
      metadata: { email: entry.email, full_name: entry.full_name },
    });

    return { ok: true, email: entry.email };
  });

export type ReportSummary = {
  id: string;
  created_at: string;
  model: string;
  user_id: string;
  user_email: string | null;
  student_first_name: string | null;
  headline: string | null;
};

export const listRecentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    // Use admin client so we see across all owners
    const { data: rows, error } = await supabaseAdmin
      .from("pathway_reports")
      .select("id, created_at, model, user_id, content, intake_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("listRecentReports failed", error);
      return { reports: [] as ReportSummary[] };
    }

    const intakeIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.intake_id).filter(Boolean)),
    );
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));

    const [{ data: intakes }, emailById] = await Promise.all([
      intakeIds.length
        ? supabaseAdmin
            .from("student_intakes")
            .select("id, student_first_name")
            .in("id", intakeIds)
        : Promise.resolve({ data: [] as any[] }),
      (async () => {
        const map = new Map<string, string | null>();
        try {
          let page = 1;
          while (true) {
            const { data: list, error: aerr } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage: 200,
            });
            if (aerr) break;
            for (const u of list.users) map.set(u.id, u.email ?? null);
            if (list.users.length < 200) break;
            page++;
            if (page > 5) break;
          }
        } catch {}
        return map;
      })(),
    ]);

    const nameByIntake = new Map<string, string | null>(
      (intakes ?? []).map((i: any) => [i.id, i.student_first_name]),
    );

    const reports: ReportSummary[] = (rows ?? []).map((r: any) => {
      const content = r.content ?? {};
      const headline =
        (typeof content.headline === "string" && content.headline) ||
        (typeof content.title === "string" && content.title) ||
        (typeof content.summary === "string" && content.summary.slice(0, 120)) ||
        null;
      return {
        id: r.id,
        created_at: r.created_at,
        model: r.model,
        user_id: r.user_id,
        user_email: emailById.get(r.user_id) ?? null,
        student_first_name: r.intake_id ? nameByIntake.get(r.intake_id) ?? null : null,
        headline,
      };
    });

    return { reports };
  });
