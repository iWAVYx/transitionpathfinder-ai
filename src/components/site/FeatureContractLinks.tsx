import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";

import {
  getPublicFeature,
  type PublicFeatureId,
  type PublicFeatureStatus,
} from "@/lib/public-feature-contract";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<PublicFeatureStatus, string> = {
  available: "border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  pilot: "border-amber-600/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  partial: "border-sky-600/25 bg-sky-500/10 text-sky-900 dark:text-sky-200",
};

export function FeatureContractLinks({
  featureId,
  compact = false,
  className,
}: {
  featureId: PublicFeatureId;
  compact?: boolean;
  className?: string;
}) {
  const feature = getPublicFeature(featureId);

  return (
    <div
      className={cn("mt-4 border-t border-border/60 pt-4", className)}
      data-feature-contract={feature.id}
      data-feature-status={feature.status}
      data-preview-route={feature.previewRoute}
      data-live-route={feature.liveRoute}
    >
      <span
        className={cn(
          "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
          STATUS_STYLE[feature.status],
        )}
      >
        {feature.statusLabel}
      </span>
      {!compact ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{feature.availability}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
        <Link
          to={feature.previewRoute}
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          Guided preview <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          to={feature.liveRoute}
          className="inline-flex items-center gap-1 text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
        >
          Open signed-in tool <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
