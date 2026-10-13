import { Button } from "@/components/ui/button";

export function OrganizationLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border p-5">
      <p className="text-sm text-foreground/75">
        Workspace information could not be loaded. Please try again.
      </p>
      <Button className="mt-3" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
