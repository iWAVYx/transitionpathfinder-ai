// Partner Network — free-vs-premium usage meter (Workstream C).
// Renders published-opportunity count against the free-tier cap plus an
// upgrade CTA when the partner is on the free tier.

import { Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PartnerTierUsage } from "@/lib/partner-tier-usage.functions";

export function TierUsageMeter({ usage }: { usage: PartnerTierUsage }) {
  const { tier, cap, publishedCount, atCap } = usage;

  if (tier === "premium" || cap === null) {
    return (
      <div
        role="status"
        aria-label="Partner tier usage"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden />
          <span className="font-medium text-emerald-900">Partner Premium</span>
          <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">
            <InfinityIcon className="mr-1 h-3 w-3" /> Unlimited opportunities
          </Badge>
        </div>
        <span className="text-xs text-emerald-800/80">
          {publishedCount} opportunity{publishedCount === 1 ? "" : "ies"} published
        </span>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((publishedCount / cap) * 100));
  const barTone = atCap
    ? "bg-amber-500"
    : pct >= 66
      ? "bg-amber-400"
      : "bg-primary";

  return (
    <div
      role="status"
      aria-label="Partner tier usage"
      className={`rounded-2xl border px-4 py-3 shadow-soft ${
        atCap ? "border-amber-300 bg-amber-50/60" : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Free tier</span>
          <Badge variant="secondary">
            {publishedCount} of {cap} published
          </Badge>
        </div>
        <a
          href="/pricing#partners"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" /> Upgrade for unlimited
        </a>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={publishedCount}
      >
        <div className={`h-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
      </div>
      {atCap && (
        <p className="mt-2 text-xs text-amber-900">
          You've reached the free-tier limit. Unpublish an existing opportunity or upgrade
          to publish more.
        </p>
      )}
    </div>
  );
}
