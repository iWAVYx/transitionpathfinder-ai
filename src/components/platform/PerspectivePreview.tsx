import type { ReactNode } from "react";

export function PerspectivePreview({
  label,
  url,
  children,
}: {
  label: string;
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lift">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-peach" />
        <span className="h-2.5 w-2.5 rounded-full bg-sky" />
        <div className="ml-3 flex flex-1 items-center gap-2 truncate rounded-md bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          <span className="truncate">{url}</span>
        </div>
        <span className="hidden rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
          {label}
        </span>
      </div>
      <div className="bg-gradient-to-b from-background to-muted/30 p-5 sm:p-6">{children}</div>
    </div>
  );
}
