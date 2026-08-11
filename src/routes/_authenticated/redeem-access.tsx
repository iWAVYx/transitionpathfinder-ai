import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { LicenseActivationPanel } from "@/components/settings/LicenseActivationPanel";

export const Route = createFileRoute("/_authenticated/redeem-access")({
  head: () => ({ meta: [{ title: "Redeem Access Code — TransitionForward" }] }),
  component: RedeemAccessCodePage,
});

function RedeemAccessCodePage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs trail={[{ label: "Get Started", to: "/get-started" }, { label: "Access Code" }]} />
        <div className="mt-6 border-y border-border/70 py-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            School Or District Access
          </p>
          <LicenseActivationPanel
            variant="page"
            successAction={
              <Button asChild>
                <Link to="/onboarding">Continue Account Setup</Link>
              </Button>
            }
          />
          <Button asChild variant="outline" className="mt-4">
            <Link to="/settings">Account Settings</Link>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
