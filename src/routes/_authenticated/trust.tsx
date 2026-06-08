import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, Users, Link2, FileCheck, Eye, EyeOff, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getTrustOverview,
  revokeShareToken,
  revokeConsent,
  type TrustStudentSummary,
} from "@/lib/trust.functions";

export const Route = createFileRoute("/_authenticated/trust")({
  head: () => ({ meta: [{ title: "Trust & Consent — TransitionForward" }] }),
  component: () => (<RoleGuard path="/trust"><TrustPage /></RoleGuard>),
});

const CONSENT_LABELS: Record<string, string> = {
  document_upload: "Document upload",
  ai_processing: "AI processing",
  team_sharing: "Team sharing",
  partner_sharing: "Partner sharing",
  school_access: "School access",
  data_export: "Data export",
};

function TrustPage() {
  const fetchOverview = useServerFn(getTrustOverview);
  const revokeShare = useServerFn(revokeShareToken);
  const revokeC = useServerFn(revokeConsent);
  const [data, setData] = useState<TrustStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchOverview();
      setData(res.students);
    } catch {
      toast.error("Couldn't load trust overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRevokeShare(id: string) {
    if (!confirm("Revoke this share link? Anyone with it will lose access.")) return;
    try {
      await revokeShare({ data: { id } });
      toast.success("Share link revoked.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't revoke.");
    }
  }

  async function handleRevokeConsent(id: string) {
    if (!confirm("Revoke this consent?")) return;
    try {
      await revokeC({ data: { id } });
      toast.success("Consent revoked.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't revoke.");
    }
  }

  return (
    <SiteShell>
      <div className="container max-w-5xl py-8 space-y-6">
        <Breadcrumbs trail={[{ label: "Trust & Consent" }]} />

        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">Trust & Consent</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            See exactly who has access to each student, what's been shared outside the platform,
            and how AI is used on this data. You can revoke access at any time.
          </p>
        </header>

        <TrustNote variant="consent" display="banner" />
        <TrustNote variant="admin-scope" display="banner" />


        {/* AI policy card */}
        <section className="rounded-xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">How AI is used here, in plain language</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>AI is used only to generate pathway suggestions, summaries, and resource matches based on the information you provide.</li>
            <li>AI outputs are clearly labeled and marked as a starting point — never a final decision.</li>
            <li>Student data is not used to train third-party AI models.</li>
            <li>You can revoke AI processing consent for any student below; new reports will stop being generated for that student until you grant it again.</li>
          </ul>
        </section>

        {loading ? (
          <div className="text-muted-foreground py-12 text-center">Loading…</div>
        ) : data.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            No students yet. Add a student to manage access and consent.
          </div>
        ) : (
          data.map((s) => (
            <section key={s.student_id} className="rounded-xl border bg-card p-6 space-y-5">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {s.first_name ?? "Student"} {s.last_name ?? ""}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {s.is_owner ? "You own this student's plan" : "Shared with you"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">{s.is_owner ? "Owner" : "Collaborator"}</Badge>
              </header>

              {/* Collaborators */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" /> People with access ({s.collaborators.length})
                </div>
                {s.collaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">Only you.</p>
                ) : (
                  <ul className="space-y-1.5 pl-6">
                    {s.collaborators.map((c) => (
                      <li key={c.id} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="font-medium">{c.email}</span>{" "}
                          <span className="text-muted-foreground">· {c.role}</span>
                        </span>
                        <Badge variant={c.status === "accepted" ? "secondary" : "outline"} className="text-xs">
                          {c.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Share tokens */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" /> Share links ({s.share_tokens.length})
                </div>
                {s.share_tokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No links shared.</p>
                ) : (
                  <ul className="space-y-2 pl-6">
                    {s.share_tokens.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {t.revoked ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                            <span className="font-medium capitalize">{t.audience}</span>
                            <span className="text-muted-foreground text-xs">
                              · {t.view_count} view{t.view_count === 1 ? "" : "s"}
                              {t.last_viewed_at ? ` · last viewed ${new Date(t.last_viewed_at).toLocaleDateString()}` : ""}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Created {new Date(t.created_at).toLocaleDateString()}
                            {t.expires_at ? ` · expires ${new Date(t.expires_at).toLocaleDateString()}` : " · no expiry"}
                          </div>
                        </div>
                        {!t.revoked && s.is_owner && (
                          <Button size="sm" variant="outline" onClick={() => handleRevokeShare(t.id)}>
                            Revoke
                          </Button>
                        )}
                        {t.revoked && <Badge variant="outline" className="text-xs">Revoked</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Consents */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileCheck className="h-4 w-4" /> Consents on file ({s.consents.length})
                </div>
                {s.consents.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No consent records yet.</p>
                ) : (
                  <ul className="space-y-1.5 pl-6">
                    {s.consents.map((c) => (
                      <li key={c.id} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="font-medium">{CONSENT_LABELS[c.consent_type] ?? c.consent_type}</span>{" "}
                          <span className="text-muted-foreground text-xs">
                            · granted {new Date(c.granted_at).toLocaleDateString()}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={c.consent_status === "granted" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {c.consent_status}
                          </Badge>
                          {c.consent_status === "granted" && (
                            <Button size="sm" variant="ghost" onClick={() => handleRevokeConsent(c.id)}>
                              Revoke
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </SiteShell>
  );
}
