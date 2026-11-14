import { Button } from "@/components/ui/button";

export function OrganizationLoadError({
  onRetry,
  onRecoverSelection,
}: {
  onRetry: () => void;
  onRecoverSelection?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border p-5">
      <p className="text-sm text-foreground/75">
        Workspace information could not be loaded. Please try again.
      </p>
      <Button className="mt-3" variant="outline" onClick={onRetry}>
        Retry
      </Button>
      {onRecoverSelection && (
        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-foreground/75">
            If this saved selection is no longer available, you can load a workspace you can access.
          </p>
          <Button className="mt-2" variant="outline" onClick={onRecoverSelection}>
            Load an Available Workspace
          </Button>
        </div>
      )}
    </div>
  );
}
