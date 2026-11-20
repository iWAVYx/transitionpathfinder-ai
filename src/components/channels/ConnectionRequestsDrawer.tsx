import { useState } from "react";
import { Inbox, X } from "lucide-react";
import { useChannelViewScope } from "./ChannelQueryBoundary";
import { Button } from "@/components/ui/button";
import { ChannelConnectionRequests, type OpenConnectionChannel } from "./ChannelConnectionRequests";
export function ConnectionRequestsDrawer({
  onOpenChannel,
  triggerLabel,
}: {
  onOpenChannel?: OpenConnectionChannel;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const scope = useChannelViewScope(JSON.stringify(["connection-drawer", open]));
  const openChannel = onOpenChannel
    ? async (channelId: string) => {
        if (!scope.isCurrent()) return;
        await onOpenChannel(channelId);
        if (scope.isCurrent()) setOpen(false);
      }
    : undefined;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open connection requests"
      >
        <Inbox className="h-4 w-4 mr-2" />
        {triggerLabel ?? "Requests"}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Connection requests"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <button
            type="button"
            aria-label="Close connection requests"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-background shadow-xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold">Connection Requests</h2>
                <p className="text-xs text-muted-foreground">
                  Review requests to open a partner channel.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="p-4">
              <ChannelConnectionRequests onOpenChannel={openChannel} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
