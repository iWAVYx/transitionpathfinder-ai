import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
};

/**
 * Drop-in staged state for dashboards when the signed-in user has no active
 * entitlement yet (waitlisted, invited but not provisioned, or pending
 * org-membership approval). No broken CTAs.
 */
export function AccessPendingCard({
  title = "Your workspace is being set up",
  description = "We're connecting your account to the right school, family, or organization. You'll get an email as soon as your access is active.",
  ctaLabel = "View what's included",
  ctaTo = "/pricing",
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        <Clock className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Access Pending
        </span>
      </div>
      <h2 className="mt-3 font-display text-xl">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {description}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to={ctaTo}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
