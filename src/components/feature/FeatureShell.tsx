import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export type FeatureShellBreadcrumb = {
  label: string;
  to?: string;
};

export type FeatureShellBackTo = {
  to: string;
  label: string;
};

export interface FeatureShellProps {
  children: ReactNode;
  breadcrumbs?: FeatureShellBreadcrumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  backTo?: FeatureShellBackTo;
  primaryAction?: ReactNode;
  /** Max content width: default is the standard "max-w-6xl" feature page width. */
  maxWidth?: "narrow" | "default" | "wide";
  className?: string;
  /** Optional test id for the feature shell container. */
  testId?: string;
}

const MAX_WIDTH: Record<NonNullable<FeatureShellProps["maxWidth"]>, string> = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

/**
 * FeatureShell — shared chrome for signed-in feature pages.
 *
 * Provides the consistent header layout already used by reports, action
 * items, and meetings: breadcrumbs, optional role-aware "Back to Dashboard"
 * link, eyebrow, title, description, and an optional primary action. The
 * content area below is fully controlled by the caller, so pages can compose
 * tabs, filters, and lists without fighting the shell.
 */
export function FeatureShell({
  children,
  breadcrumbs = [],
  eyebrow,
  title,
  description,
  backTo,
  primaryAction,
  maxWidth = "default",
  className,
  testId,
}: FeatureShellProps) {
  return (
    <SiteShell>
      <div
        className={cn("mx-auto w-full px-4 py-6 md:py-10", MAX_WIDTH[maxWidth], className)}
        data-testid={testId}
      >
        {backTo ? (
          <Link
            to={backTo.to as never}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backTo.label}
          </Link>
        ) : null}

        {breadcrumbs.length > 0 ? (
          <div className={cn(backTo ? "mt-2" : "")}>
            <Breadcrumbs trail={breadcrumbs} />
          </div>
        ) : null}

        <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {primaryAction ? (
            <div className="flex shrink-0 items-center gap-2">{primaryAction}</div>
          ) : null}
        </header>

        {children}
      </div>
    </SiteShell>
  );
}
