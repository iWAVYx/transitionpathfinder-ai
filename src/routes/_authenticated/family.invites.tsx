import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { InvitesInbox } from "@/components/dashboard/InvitesInbox";

export const Route = createFileRoute("/_authenticated/family/invites")({
  head: () => ({
    meta: [
      { title: "Invite Team Members — TransitionForward" },
      {
        name: "description",
        content:
          "Invite a co-parent, case manager, advocate, or coach to join your student's transition team.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/family/invites">
      <FamilyInvitesPage />
    </RoleGuard>
  ),
});

function FamilyInvitesPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumbs trail={[{ label: "Family", to: "/hubs/family" }, { label: "Invite Team Members" }]} />
        <header className="mt-4 mb-8">
          <div className="flex items-center gap-3">
            <UserPlus className="h-7 w-7 text-primary" aria-hidden />
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Invite Team Members
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Bring a co-parent, case manager, coach, or advocate into your student's plan.
            Every invitation includes a role and permission level — you can revoke anytime.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-medium">Send An Invite</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a student profile to invite a co-parent, case manager, coach, or advocate.
              Every invitation includes a role (view, comment, or edit).
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" aria-hidden /> Secure invite by email</li>
              <li className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden /> Revoke sharing anytime</li>
            </ul>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link to="/students">Choose Student To Invite From</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-medium">Pending & Received Invites</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track invites you've sent and respond to invites others have sent you.
            </p>
            <div className="mt-4">
              <InvitesInbox />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">You control access.</strong> Every invited
            member has a specific role (view, comment, or edit). Manage or revoke sharing
            anytime from <Link className="text-primary underline-offset-4 hover:underline" to="/family/consent">Sharing &amp; Consent</Link>.
          </p>
        </div>

        <div className="mt-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/hubs/family">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back To Family Workspace
            </Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  );
}
