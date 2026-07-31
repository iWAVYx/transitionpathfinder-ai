/**
 * Exceptional ("break-glass") access oversight — Phase 1.
 *
 * Platform admins have no routine access to student IEP content. When an
 * override is unavoidable, `admin_doc_access_grants` records who did it, why,
 * under what scope, against which case, and for how long. The row is an
 * immutable audit record enforced by a database trigger; the only permitted
 * mutation is early revocation.
 *
 * Nothing here returns student names, document titles, or plan content — the
 * console shows accountability metadata only.
 */

export const SUPPORT_ACCESS_SCOPES = [
  "single_document",
  "compliance_audit",
  "support_ticket",
  "data_request",
] as const;

export type SupportAccessScope = (typeof SUPPORT_ACCESS_SCOPES)[number];

export const SUPPORT_ACCESS_SCOPE_LABELS: Record<SupportAccessScope, string> = {
  single_document: "Single Document",
  compliance_audit: "Compliance Audit",
  support_ticket: "Support Ticket",
  data_request: "Data Request / Legal Review",
};

export type SupportAccessGrant = {
  id: string;
  actorId: string;
  actorName: string;
  documentRef: string;
  reason: string;
  scope: SupportAccessScope;
  caseReference: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
};

type Client = { from: (table: string) => any };

export async function requirePlatformAdminAccess(
  supabase: Client,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Forbidden: Platform admin access required.");
  }
}

export async function listGrants(
  supabase: Client,
  limit: number,
): Promise<SupportAccessGrant[]> {
  const { data, error } = await supabase
    .from("admin_doc_access_grants")
    .select("id, actor_id, document_id, reason, scope, case_reference, created_at, expires_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const actorIds = Array.from(new Set(rows.map((r: any) => r.actor_id)));
  const names = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      names.set(p.id, p.full_name || p.email || "Unknown admin");
    }
  }

  const now = Date.now();
  return rows.map((r: any) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: names.get(r.actor_id) ?? "Unknown admin",
    // Never expose the document title or the student it belongs to.
    documentRef: `doc-${String(r.document_id).slice(0, 8)}`,
    reason: r.reason,
    scope: r.scope as SupportAccessScope,
    caseReference: r.case_reference ?? null,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at ?? null,
    status: r.revoked_at
      ? ("revoked" as const)
      : new Date(r.expires_at).getTime() > now
        ? ("active" as const)
        : ("expired" as const),
  }));
}

export async function revokeGrant(
  supabase: Client,
  userId: string,
  grantId: string,
): Promise<void> {
  const { error } = await supabase
    .from("admin_doc_access_grants")
    .update({ revoked_at: new Date().toISOString(), revoked_by: userId })
    .eq("id", grantId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);

  await supabase.from("admin_activity_logs").insert({
    admin_user_id: userId,
    action_type: "support_access_revoked",
    target_type: "admin_doc_access_grant",
    target_id: grantId,
  });
}
