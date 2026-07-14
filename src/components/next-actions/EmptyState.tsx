import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NextActionsEmptyState({
  suggestionLabel,
  suggestionRoute,
}: {
  suggestionLabel?: string;
  suggestionRoute?: string;
}) {
  return (
    <div
      className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-5"
      data-testid="next-actions-empty"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <p className="font-display text-base font-medium tracking-tight">
          No Urgent Actions Right Now
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Nothing needs your attention today. When new tasks come in — a draft
        report, a document to upload, a meeting to confirm — they'll appear
        here.
      </p>
      {suggestionLabel && suggestionRoute ? (
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to={suggestionRoute}>{suggestionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
