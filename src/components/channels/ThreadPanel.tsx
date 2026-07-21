import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sendChannelMessage, type ChannelMessage } from "@/lib/channels.functions";
import { listThreadMessages } from "@/lib/channel-messages.functions";
import { MessageItem, useMessageAttachments } from "./MessageItem";

export type ThreadPanelProps = {
  parentId: string | null;
  channelId: string | null;
  currentUserId: string | null;
  isAdmin: boolean;
  bookmarkedIds: Set<string>;
  onClose: () => void;
  onChanged: () => void;
};

export function ThreadPanel({
  parentId,
  channelId,
  currentUserId,
  isAdmin,
  bookmarkedIds,
  onClose,
  onChanged,
}: ThreadPanelProps) {
  const open = !!parentId;
  const loadFn = useServerFn(listThreadMessages);
  const sendFn = useServerFn(sendChannelMessage);
  const qc = useQueryClient();

  const threadQuery = useQuery({
    queryKey: ["channel-thread", parentId],
    queryFn: () => loadFn({ data: { parent_id: parentId! } }),
    enabled: open,
  });

  const parent = threadQuery.data?.parent ?? null;
  const replies = useMemo(() => threadQuery.data?.replies ?? [], [threadQuery.data]);

  const messageIds = useMemo(
    () => (parent ? [parent.id, ...replies.map((r) => r.id)] : replies.map((r) => r.id)),
    [parent, replies],
  );
  const { byMessage } = useMessageAttachments(messageIds);

  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!open) setDraft("");
  }, [open]);

  // Live updates for this thread.
  useEffect(() => {
    if (!open || !channelId) return;
    const ch = supabase
      .channel(`channel-thread-${parentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["channel-thread", parentId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, channelId, parentId, qc]);

  const sendMut = useMutation({
    mutationFn: (body: string) =>
      sendFn({
        data: {
          channel_id: channelId!,
          body,
          parent_id: parentId!,
          client_dedupe_key: `${parentId}:${Date.now()}`,
        },
      }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["channel-thread", parentId] });
      onChanged();
    },
  });

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Thread</SheetTitle>
            <button
              type="button"
              className="rounded-md p-1 hover:bg-muted"
              onClick={onClose}
              aria-label="Close thread"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {threadQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading thread…</p>
          ) : !parent ? (
            <p className="text-sm text-muted-foreground">Thread not available.</p>
          ) : (
            <>
              <MessageItem
                m={parent}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                bookmarked={bookmarkedIds.has(parent.id)}
                attachments={byMessage.get(parent.id) ?? []}
                onReply={() => {}}
                onChanged={() => {
                  qc.invalidateQueries({ queryKey: ["channel-thread", parentId] });
                  onChanged();
                }}
                compact
              />
              <div className="pl-4 border-l space-y-2">
                {replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No replies yet. Start the thread below.
                  </p>
                ) : (
                  replies.map((r) => (
                    <MessageItem
                      key={r.id}
                      m={r}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      bookmarked={bookmarkedIds.has(r.id)}
                      attachments={byMessage.get(r.id) ?? []}
                      onReply={() => {}}
                      onChanged={() => {
                        qc.invalidateQueries({ queryKey: ["channel-thread", parentId] });
                        onChanged();
                      }}
                      compact
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <form
          className="border-t p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            if (!body || sendMut.isPending || !channelId) return;
            sendMut.mutate(body);
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Reply in thread…"
            className="resize-none"
            aria-label="Thread reply"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const body = draft.trim();
                if (body && !sendMut.isPending && channelId) sendMut.mutate(body);
              }
            }}
          />
          <Button type="submit" disabled={!draft.trim() || sendMut.isPending || !channelId}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send reply</span>
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
