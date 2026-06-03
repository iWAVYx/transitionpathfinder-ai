import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  previewAdminInvitation,
  acceptAdminInvitation,
  ADMIN_ROLE_LABELS,
  type AdminRole,
} from "@/lib/owner/owner.functions";

type Preview = {
  email: string;
  role: AdminRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
} | null;

export const Route = createFileRoute("/admin-invite/$token")({
  head: () => ({ meta: [{ title: "Admin invitation — TransitionForward" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const preview = useServerFn(previewAdminInvitation);
  const accept = useServerFn(acceptAdminInvitation);

  const [invite, setInvite] = useState<Preview>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState<AdminRole | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: `/admin-invite/${token}` },
        replace: true,
      });
      return;
    }
    preview({ data: { token } })
      .then((r) => {
        if (!r.invitation) setError("This invitation link is invalid or has been deleted.");
        else setInvite(r.invitation);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load invitation."))
      .finally(() => setChecking(false));
  }, [loading, user, token, preview, navigate]);

  const onAccept = async () => {
    setAccepting(true);
    try {
      const r = await accept({ data: { token } });
      setDone(r.role);
      toast.success(`You're now a ${ADMIN_ROLE_LABELS[r.role]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't accept invitation.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Admin Hub invitation
            </span>
          </div>

          {loading || checking ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your invitation…
            </div>
          ) : error ? (
            <div className="mt-6 flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" /> {error}
            </div>
          ) : done ? (
            <>
              <div className="mt-6 flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  You've been granted{" "}
                  <strong>{ADMIN_ROLE_LABELS[done]}</strong> access.
                </span>
              </div>
              <Button asChild className="mt-6 w-full">
                <Link to="/owner">Open Admin Hub</Link>
              </Button>
            </>
          ) : invite ? (
            <>
              <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
                You've been invited to the Admin Hub
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Role: <strong>{ADMIN_ROLE_LABELS[invite.role]}</strong>
                <br />
                Invitation sent to <strong>{invite.email}</strong>
                <br />
                Expires {new Date(invite.expires_at).toLocaleDateString()}
              </p>

              {invite.status !== "pending" ? (
                <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-sm">
                  This invitation is{" "}
                  <strong>{invite.status}</strong> and can no longer be accepted.
                </div>
              ) : (
                <Button
                  onClick={onAccept}
                  disabled={accepting}
                  className="mt-6 w-full"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accepting…
                    </>
                  ) : (
                    "Accept and unlock Admin Hub"
                  )}
                </Button>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                You're signed in as {user?.email}. If that doesn't match the
                invited email, sign out and sign back in with the correct
                account.
              </p>
            </>
          ) : null}
        </div>
      </section>
    </SiteShell>
  );
}
