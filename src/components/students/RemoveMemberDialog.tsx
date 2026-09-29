import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatHistoryAccess } from "@/lib/chat-history-access";

export function RemoveMemberDialog({
  name,
  onCancel,
  onConfirm,
  updateStatus = false,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: (choice: ChatHistoryAccess) => Promise<void>;
  updateStatus?: boolean;
}) {
  const [choice, setChoice] = useState<ChatHistoryAccess | null>(null);
  const [busy, setBusy] = useState(false);
  async function confirmRemoval() {
    if (!choice || busy) return;
    setBusy(true);
    try {
      await onConfirm(choice);
      onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove member.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {updateStatus ? `End active membership for ${name}?` : `Remove ${name}?`}
          </DialogTitle>
          <DialogDescription>
            Choose whether they can keep reading this student’s past conversations. Either choice
            stops new messages, replies, and chat notifications for them. Other permissions for this
            student are managed separately.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Chat history access</legend>
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="chat-history-access"
              checked={choice === "remove"}
              onChange={() => setChoice("remove")}
            />
            <span>
              <strong className="text-sm">Remove all chat access</strong>
              <span className="block text-sm text-muted-foreground">
                They cannot open past messages or attachments.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <input
              type="radio"
              name="chat-history-access"
              checked={choice === "keep_read_only"}
              onChange={() => setChoice("keep_read_only")}
            />
            <span>
              <strong className="text-sm">Keep past history read-only</strong>
              <span className="block text-sm text-muted-foreground">
                They can read a copy of messages and available attachments from before removal,
                without later edits or new activity.
              </span>
            </span>
          </label>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!choice || busy} onClick={confirmRemoval}>
            {busy ? "Removing…" : updateStatus ? "Update member" : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
