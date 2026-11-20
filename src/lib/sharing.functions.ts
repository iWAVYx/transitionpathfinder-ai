import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";
import { readReportPages, readReportBatches } from "./report-query-pages";

/**
 * Consolidated "Who can see this student?" panel data.
 *
 * Combines three independent access surfaces into one read-only overview:
 *   - student_collaborators  (in-app editors/viewers, status = 'accepted')
 *   - student_relationships  (parents, case managers, consent_status = 'approved')
 *   - share_tokens           (public report links, not revoked, not expired)
 *
 * Management still lives in the granular panels on the same page (the
 * CollaboratorsPanel, relationship requests, share token controls). This
 * surface exists so a guardian/student/case manager can answer the
 * single question "who currently has access?" without hunting.
 */

export type AccessCollaboratorEntry = {
  kind: "collaborator";
  id: string;
  name: string | null;
  email: string;
  role: string;
  added_at: string;
};

export type AccessRelationshipEntry = {
  kind: "relationship";
  id: string;
  name: string | null;
  email: string | null;
  relationship_type: string;
  permission_level: string;
  added_at: string;
};

export type AccessShareLinkEntry = {
  kind: "share_link";
  id: string;
  report_id: string;
  audience: string;
  expires_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

export type AccessOverview = {
  collaborators: AccessCollaboratorEntry[];
  relationships: AccessRelationshipEntry[];
  share_links: AccessShareLinkEntry[];
};

export const getStudentAccessOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid(), ...viewerIntentSchema.shape }).parse(i),
  )
  .handler(async ({ data, context }): Promise<AccessOverview> => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;
    const studentId = data.student_id;

    const [collabsRes, relsRes, reportsRes] = await Promise.all([
      readReportPages((from, to) => supabase
        .from("student_collaborators")
        .select("id, user_id, invited_email, role, created_at, status", { count: "exact" })
        .eq("student_id", studentId)
        .eq("status", "accepted").order("id").range(from, to)),
      readReportPages((from, to) => supabase
        .from("student_relationships")
        .select(
          "id, related_user_id, relationship_type, permission_level, created_at, consent_status",
          { count: "exact" },
        )
        .eq("student_id", studentId)
        .eq("consent_status", "approved").order("id").range(from, to)),
      readReportPages((from, to) => supabase
        .from("pathway_reports")
        .select("id", { count: "exact" })
        .eq("student_id", studentId).order("id").range(from, to)),
    ]);

    const collabRows = collabsRes as Array<{
      id: string;
      user_id: string | null;
      invited_email: string;
      role: string;
      created_at: string;
    }>;
    const relRows = relsRes as Array<{
      id: string;
      related_user_id: string;
      relationship_type: string;
      permission_level: string;
      created_at: string;
    }>;
    const reportIds = reportsRes.map((r) => r.id as string);

    // Resolve profiles for the user-backed rows
    const userIds = new Set<string>();
    collabRows.forEach((c) => c.user_id && userIds.add(c.user_id));
    relRows.forEach((r) => userIds.add(r.related_user_id));
    const profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.size > 0) {
      const ps = await readReportBatches(Array.from(userIds), (ids, from, to) => supabase
        .from("profiles")
        .select("id, full_name, email", { count: "exact" })
        .in("id", ids).order("id").range(from, to));
      (ps ?? []).forEach((p) => {
        profiles[p.id as string] = {
          full_name: (p.full_name as string | null) ?? null,
          email: (p.email as string | null) ?? null,
        };
      });
    }

    // Active share tokens across all reports for this student
    let shareRows: Array<{
      id: string;
      report_id: string;
      audience: string;
      expires_at: string | null;
      view_count: number;
      last_viewed_at: string | null;
      created_at: string;
    }> = [];
    if (reportIds.length > 0) {
      const sl = await readReportBatches(reportIds, (ids, from, to) => supabase
        .from("share_tokens")
        .select(
          "id, report_id, audience, expires_at, view_count, last_viewed_at, created_at, revoked",
          { count: "exact" },
        )
        .in("report_id", ids)
        .eq("revoked", false).order("id").range(from, to));
      const observedAt = Date.now();
      shareRows = ((sl ?? []) as Array<{
        id: string;
        report_id: string;
        audience: string;
        expires_at: string | null;
        view_count: number;
        last_viewed_at: string | null;
        created_at: string;
        revoked: boolean;
      }>)
        .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > observedAt)
        .map((r) => ({
          id: r.id,
          report_id: r.report_id,
          audience: r.audience,
          expires_at: r.expires_at,
          view_count: r.view_count,
          last_viewed_at: r.last_viewed_at,
          created_at: r.created_at,
        }));
    }

    return {
      collaborators: collabRows.map((c) => {
        const prof = c.user_id ? profiles[c.user_id] : undefined;
        return {
          kind: "collaborator" as const,
          id: c.id,
          name: prof?.full_name ?? null,
          email: prof?.email ?? c.invited_email,
          role: c.role,
          added_at: c.created_at,
        };
      }),
      relationships: relRows.map((r) => {
        const prof = profiles[r.related_user_id];
        return {
          kind: "relationship" as const,
          id: r.id,
          name: prof?.full_name ?? null,
          email: prof?.email ?? null,
          relationship_type: r.relationship_type,
          permission_level: r.permission_level,
          added_at: r.created_at,
        };
      }),
      share_links: shareRows.map((r) => ({
        kind: "share_link" as const,
        id: r.id,
        report_id: r.report_id,
        audience: r.audience,
        expires_at: r.expires_at,
        view_count: r.view_count,
        last_viewed_at: r.last_viewed_at,
        created_at: r.created_at,
      })),
    };
  });
