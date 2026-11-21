import { Button } from "@/components/ui/button";
export function StudentCreationRecovery({
  recovery,
  onContinue,
  onClose,
}: {
  recovery: {
    ready: boolean;
    intent: unknown;
    error: string | null;
    status?: string;
    check: () => Promise<void>;
  };
  onContinue?: () => void;
  onClose?: () => void;
}) {
  if (!recovery.intent && !recovery.error) return null;
  return (
    <div role="status" className="my-4 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
      <p>
        {recovery.error ??
          (recovery.status === "present"
            ? "Your student profile is saved. Continue with the saved profile instead of adding it again."
            : recovery.status === "removed"
              ? "This student profile was removed. It will not be recreated. Please review your student list before starting a new setup."
              : "An earlier student setup needs checking. We’ll check what was saved before you continue.")}
      </p>
      <Button type="button" variant="outline" onClick={() => void recovery.check()}>
        Check Saved Setup
      </Button>
      {!recovery.error && recovery.status === "present" && onContinue && (
        <Button type="button" onClick={onContinue}>
          Continue With Saved Profile
        </Button>
      )}
      {!recovery.error &&
        onClose &&
        (recovery.status === "unconfirmed" || recovery.status === "removed") && (
          <div className="space-y-2">
            <p>
              Close the earlier request before starting again. This prevents it from finishing later
              and does not delete a saved profile.
            </p>
            <Button type="button" variant="outline" onClick={onClose}>
              Close This Setup Request
            </Button>
          </div>
        )}
    </div>
  );
}
