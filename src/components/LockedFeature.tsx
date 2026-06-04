import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  /** Optional eyebrow label, e.g. "School Administrator" */
  eyebrow?: string;
  /** Optional secondary "back to dashboard" CTA */
  backTo?: string;
  backLabel?: string;
};

/**
 * Polished "coming soon" card for nav destinations that don't have a real
 * page yet. Keeps the workspace shell consistent and avoids broken links.
 */
export function LockedFeature({
  title,
  description,
  eyebrow,
  backTo = "/dashboard",
  backLabel = "Back to dashboard",
}: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-6 w-6" />
      </div>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Coming soon
      </div>
      <div className="mt-8">
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
