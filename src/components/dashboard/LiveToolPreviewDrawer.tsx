import { Link } from "@tanstack/react-router";
import { ArrowRight, Database, LockKeyhole, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ToolPreviewBullet } from "@/components/dashboard/ToolPreviewCard";
import { toTitleCase } from "@/lib/title-case";

export type LiveToolPreview = {
  icon: LucideIcon;
  title: string;
  summary: string;
  status?: string;
  bullets?: ToolPreviewBullet[];
  cta: {
    label: string;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  };
  dataSource: string;
  privacyNote: string;
};

export function LiveToolPreviewDrawer({
  preview,
  onOpenChange,
}: {
  preview: LiveToolPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const Icon = preview?.icon;

  return (
    <Sheet open={!!preview} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto overscroll-contain touch-pan-y p-0 sm:max-w-lg"
        data-testid="live-tool-preview-drawer"
      >
        {preview && Icon && (
          <>
            <SheetHeader className="border-b bg-muted/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Signed-In Preview
                  </p>
                  <SheetTitle className="text-left font-display text-xl">
                    {toTitleCase(preview.title)}
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="text-left text-sm leading-relaxed">
                {preview.summary}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-6">
              {preview.status && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Current Status
                  </p>
                  <p className="mt-1 font-display text-lg text-foreground">{preview.status}</p>
                </div>
              )}

              <section aria-labelledby="live-preview-details">
                <h3
                  id="live-preview-details"
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70"
                >
                  At A Glance
                </h3>
                {preview.bullets && preview.bullets.length > 0 ? (
                  <dl className="mt-2 divide-y divide-border rounded-xl border bg-card">
                    {preview.bullets.map((bullet) => (
                      <div
                        key={bullet.label}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <dt className="text-sm text-foreground/70">{toTitleCase(bullet.label)}</dt>
                        <dd className="text-right text-sm font-semibold text-foreground">
                          {bullet.value ?? "Not available"}
                          {bullet.hint && (
                            <span className="ml-1 text-xs font-normal text-foreground/60">
                              {bullet.hint}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-foreground/70">
                    Nothing has been added here yet. Open the full tool to get started.
                  </p>
                )}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewBoundary icon={Database} label="Data source" value={preview.dataSource} />
                <PreviewBoundary
                  icon={LockKeyhole}
                  label="Privacy boundary"
                  value={preview.privacyNote}
                />
              </div>
            </div>

            <div className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button asChild size="lg" className="w-full">
                <Link
                  to={preview.cta.to as string}
                  params={preview.cta.params as never}
                  search={preview.cta.search as never}
                  onClick={() => onOpenChange(false)}
                >
                  {toTitleCase(preview.cta.label)}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PreviewBoundary({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/70">{value}</p>
    </div>
  );
}
