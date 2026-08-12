import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { acceptInvitation } from "@/lib/invitations.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept Invitation — TransitionForward" }] }),
  component: AcceptInvitationPage,
});

const TYPE_LABELS: Record<string, string> = {
  connect_to_student: "connect to a student",
  join_school: "join a school",
  join_district: "join a district",
  join_partner_org: "join a partner organization",
};

function AcceptInvitationPage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvitation);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: `/invite/${token}` },
        replace: true,
      });
    }
  }, [loading, user, token, navigate]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await accept({ data: { token } });
      setDone(r.invitation_type);
      toast.success("Invitation accepted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Invitation
            </span>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your session…
            </div>
          ) : done ? (
            <>
              <div className="mt-6 flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  You've been connected. We've taken care of the{" "}
                  <strong>{TYPE_LABELS[done] ?? "invitation"}</strong> step for
                  you.
                </span>
              </div>
              <Button asChild className="mt-6 w-full">
                <Link to="/onboarding">Continue Account Setup</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
                You've been invited to TransitionForward
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Signed in as <strong>{user?.email}</strong>. If that doesn't
                match the invited email, sign out and sign back in with the
                correct account.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" /> {error}
                </div>
              )}

              <Button
                onClick={handleAccept}
                disabled={submitting || !user}
                className="mt-6 w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accepting…
                  </>
                ) : (
                  "Accept invitation"
                )}
              </Button>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
