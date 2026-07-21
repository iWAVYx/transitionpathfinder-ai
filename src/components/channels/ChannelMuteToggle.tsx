import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setChannelNotificationSettings } from "@/lib/channel-notifications.functions";

export function ChannelMuteToggle({
  channelId,
  muted,
}: {
  channelId: string;
  muted: boolean;
}) {
  const qc = useQueryClient();
  const setFn = useServerFn(setChannelNotificationSettings);
  const mut = useMutation({
    mutationFn: (next: boolean) =>
      setFn({ data: { channel_id: channelId, muted: next } }),
    onSuccess: (_r, next) => {
      qc.invalidateQueries({ queryKey: ["my-channels"] });
      qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
      toast.success(next ? "Channel muted" : "Notifications on");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Could not update";
      toast.error(msg);
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={() => mut.mutate(!muted)}
      disabled={mut.isPending}
      aria-pressed={muted}
      title={muted ? "Unmute this channel" : "Mute this channel"}
    >
      {muted ? (
        <>
          <BellOff className="h-3.5 w-3.5" /> Muted
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5" /> Notifying
        </>
      )}
    </Button>
  );
}
