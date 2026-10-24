import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { useChannelViewScope } from "./ChannelQueryBoundary";
import { Send, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sendChannelMessage } from "@/lib/channels.functions";
import { listThreadMessages } from "@/lib/channel-messages.functions";
import { MessageItem, useMessageAttachments } from "./MessageItem";

export type ThreadPanelProps = {
  parentId: string | null;
  channelId: string | null;
  currentUserId: string | null;
  isAdmin: boolean;
  readOnly?: boolean;
  bookmarkedIds: Set<string>;
  bookmarksAvailable?: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ThreadPanel(props: ThreadPanelProps) {
  return (
    <ThreadSession
      key={JSON.stringify([props.channelId, props.parentId, props.currentUserId, props.readOnly])}
      {...props}
    />
  );
}

function ThreadSession({
  parentId,
  channelId,
  currentUserId,
  isAdmin,
  readOnly = false,
  bookmarkedIds,
  bookmarksAvailable = false,
  onClose,
  onChanged,
}: ThreadPanelProps) {
  const scope = useChannelViewScope(
    JSON.stringify([channelId, parentId, currentUserId, !!parentId, readOnly]),
  );
  const open = !!parentId;
  const eligible = open && !!channelId && currentUserId === scope.viewerId;
  const queryKey = ["channel-thread", channelId, parentId];
  const loadFn = useServerFn(listThreadMessages);
  const sendFn = useServerFn(sendChannelMessage);
  const qc = useQueryClient();

  const threadQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!scope.isCurrent() || !eligible) throw new Error("Thread changed.");
      const result = await loadFn({
        data: {
          parent_id: parentId!,
          expected_channel_id: channelId!,
          expected_viewer_id: scope.viewerId,
        },
      });
      if (!scope.isCurrent()) throw new Error("Thread changed.");
      if (
        !result?.parent ||
        result.parent.id !== parentId ||
        result.parent.channel_id !== channelId ||
        !Array.isArray(result.replies) ||
        typeof result.hasMore !== "boolean" ||
        result.replies.some(
          (reply) =>
            !z.string().uuid().safeParse(reply.id).success ||
            reply.parent_id !== parentId ||
            reply.channel_id !== channelId,
        )
      )
        throw new Error("Thread response mismatch.");
      return result;
    },
    enabled: eligible,
    retry: false,
  });

  const parent = eligible && threadQuery.isSuccess ? (threadQuery.data?.parent ?? null) : null;
  const replies = useMemo(
    () => (parent ? (threadQuery.data?.replies ?? []) : []),
    [parent, threadQuery.data],
  );

  const messageIds = useMemo(
    () => (parent ? [parent.id, ...replies.map((r) => r.id)] : replies.map((r) => r.id)),
    [parent, replies],
  );
  const {
    byMessage,
    error: attachmentsError,
    refetch: refreshAttachments,
  } = useMessageAttachments(messageIds, channelId);

  const [draft, setDraft] = useState("");
  const revision = useRef(0);
  const pending = useRef(false);
  const keys = useRef(new Map<string, string>());
  const changed = () => {
    if (!scope.isCurrent()) return;
    void qc.invalidateQueries({ queryKey });
    onChanged();
  };
  useEffect(() => {
    if (!open) setDraft("");
  }, [open]);

  // Live updates for this thread.
  useEffect(() => {
    if (!eligible || !scope.isCurrent()) return;
    let cancelled = false;
    const ch = supabase
      .channel(`channel-thread-${scope.viewerId}-${channelId}-${parentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          if (!cancelled && scope.isCurrent()) void qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void Promise.resolve(supabase.removeChannel(ch)).catch(() => undefined);
    };
  }, [eligible, channelId, parentId, qc, scope.isCurrent, scope.viewerId]);

  const sendMut = useMutation({
    mutationFn: async (request: { body: string; revision: number; key: string }) => {
      if (!scope.isCurrent() || !eligible || !parent || readOnly || parent.deleted_at)
        throw new Error("Thread changed.");
      const result = await sendFn({
        data: {
          channel_id: channelId!,
          parent_id: parentId!,
          body: request.body,
          client_dedupe_key: request.key,
          expected_viewer_id: scope.viewerId,
        },
      });
      if (
        !result?.message ||
        !z.string().uuid().safeParse(result.message.id).success ||
        result.message.channel_id !== channelId ||
        result.message.parent_id !== parentId ||
        result.message.author_id !== scope.viewerId
      )
        throw new Error("Reply response mismatch.");
      return { request };
    },
    onSuccess: ({ request }) => {
      if (!scope.isCurrent()) return;
      keys.current.delete(request.body);
      if (revision.current === request.revision) {
        setDraft("");
        revision.current += 1;
      }
      changed();
    },
    onError: () => {
      if (scope.isCurrent())
        toast.error(
          "We couldn't confirm your reply was sent. Your draft is still here; reload the thread before trying again.",
        );
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const submit = () => {
    const body = draft.trim();
    if (
      !body ||
      pending.current ||
      !scope.isCurrent() ||
      !eligible ||
      !parent ||
      readOnly ||
      parent.deleted_at ||
      !threadQuery.isSuccess
    )
      return;
    const key = keys.current.get(body) ?? crypto.randomUUID();
    keys.current.set(body, key);
    pending.current = true;
    sendMut.mutate({ body, revision: revision.current, key });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Thread</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              disabled={!eligible || threadQuery.isFetching}
              onClick={() => {
                if (scope.isCurrent()) void threadQuery.refetch();
              }}
            >
              Refresh Thread
            </Button>
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
          ) : threadQuery.isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>We couldn't load this thread. Your draft is still here.</p>
              <Button variant="outline" size="sm" onClick={() => void threadQuery.refetch()}>
                Reload Thread
              </Button>
            </div>
          ) : !parent ? (
            <p className="text-sm text-muted-foreground">Thread not available.</p>
          ) : (
            <>
              {attachmentsError && (
                <div role="alert" className="text-sm">
                  <p>We couldn't load this thread's attachments.</p>
                  <Button size="sm" variant="outline" onClick={() => void refreshAttachments()}>
                    Reload Attachments
                  </Button>
                </div>
              )}
              <MessageItem
                readOnly={readOnly}
                m={parent}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                bookmarked={bookmarksAvailable ? bookmarkedIds.has(parent.id) : null}
                attachments={byMessage.get(parent.id) ?? []}
                onReply={() => {}}
                onChanged={changed}
                compact
              />
              {threadQuery.data?.hasMore && (
                <p className="text-xs text-muted-foreground">
                  Showing the first 200 replies. More replies are recorded in this thread.
                </p>
              )}
              <div className="pl-4 border-l space-y-2">
                {replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No replies yet. Start the thread below.
                  </p>
                ) : (
                  replies.map((r) => (
                    <MessageItem
                      key={r.id}
                      readOnly={readOnly}
                      m={r}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      bookmarked={bookmarksAvailable ? bookmarkedIds.has(r.id) : null}
                      attachments={byMessage.get(r.id) ?? []}
                      onReply={() => {}}
                      onChanged={changed}
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
            submit();
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => {
              revision.current += 1;
              setDraft(e.target.value);
            }}
            rows={2}
            placeholder="Reply in thread…"
            className="resize-none"
            aria-label="Thread reply"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="submit"
            disabled={
              !draft.trim() ||
              sendMut.isPending ||
              !eligible ||
              !parent ||
              readOnly ||
              !!parent.deleted_at ||
              !threadQuery.isSuccess
            }
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send reply</span>
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
