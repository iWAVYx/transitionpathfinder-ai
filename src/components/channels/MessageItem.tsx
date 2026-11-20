import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useChannelViewScope } from "./ChannelQueryBoundary";
import { openChannelAttachment } from "@/lib/channel-attachment-download.browser";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pin,
  PinOff,
  Reply,
  Bookmark,
  BookmarkCheck,
  CircleHelp,
  Pencil,
  Trash2,
  Paperclip,
  Download,
  MessageSquare,
  ListPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChannelMessage } from "@/lib/channels.functions";
import {
  editChannelMessage,
  deleteChannelMessage,
  setMessagePinned,
  toggleBookmark,
  listMessageAttachments,
  getAttachmentDownloadUrl,
  type ChannelAttachment,
} from "@/lib/channel-messages.functions";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type MessageItemProps = {
  m: ChannelMessage;
  currentUserId: string | null;
  isAdmin: boolean;
  bookmarked: boolean | null;
  attachments: ChannelAttachment[];
  replyCount?: number;
  onReply: (parent: ChannelMessage) => void;
  onPromote?: (m: ChannelMessage) => void;
  onChanged: () => void;
  compact?: boolean;
  readOnly?: boolean;
};

export function MessageItem(props: MessageItemProps) {
  return (
    <MessageSession
      key={JSON.stringify([props.m.id, props.m.channel_id, props.currentUserId, props.readOnly])}
      {...props}
    />
  );
}
function MessageSession({
  m,
  currentUserId,
  isAdmin,
  bookmarked,
  attachments,
  replyCount,
  onReply,
  onPromote,
  onChanged,
  compact,
  readOnly = false,
}: MessageItemProps) {
  const scope = useChannelViewScope(
    JSON.stringify([
      m.id,
      m.channel_id,
      currentUserId,
      m.body,
      m.edited_at,
      m.deleted_at,
      m.pinned,
      m.author_id,
      readOnly,
      isAdmin,
      bookmarked,
    ]),
  );
  const eligible = currentUserId === scope.viewerId;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const [baseBody, setBaseBody] = useState(m.body);
  const revision = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    if (!editing) setDraft(m.body);
  }, [m.body, editing]);

  const editFn = useServerFn(editChannelMessage);
  const delFn = useServerFn(deleteChannelMessage);
  const pinFn = useServerFn(setMessagePinned);
  const bookmarkFn = useServerFn(toggleBookmark);

  type Action =
    | { kind: "edit"; body: string; revision: number; base: string }
    | { kind: "delete" }
    | { kind: "pin"; pinned: boolean }
    | { kind: "bookmark"; bookmarked: boolean };
  const action = useMutation({
    mutationFn: async (captured: {
      request: Action;
      currentView: () => boolean;
      viewerId: string;
      messageId: string;
      channelId: string;
    }) => {
      const request = captured.request;
      if (!captured.currentView()) throw new Error("Message changed.");
      if (
        !scope.isCurrent() ||
        !eligible ||
        m.deleted_at ||
        (readOnly && request.kind !== "bookmark") ||
        (request.kind === "bookmark" && bookmarked === null)
      )
        throw new Error("Message changed.");
      const intent = {
        message_id: captured.messageId,
        expected_channel_id: captured.channelId,
        expected_viewer_id: captured.viewerId,
      };
      let result;
      if (request.kind === "edit")
        result = await editFn({
          data: { ...intent, body: request.body, expected_body: request.base },
        });
      else if (request.kind === "delete") result = await delFn({ data: intent });
      else if (request.kind === "pin")
        result = await pinFn({ data: { ...intent, pinned: request.pinned } });
      else result = await bookmarkFn({ data: { ...intent, bookmarked: request.bookmarked } });
      if (
        request.kind === "bookmark"
          ? !(result && "bookmarked" in result && result.bookmarked === request.bookmarked)
          : !(result && "ok" in result && result.ok === true)
      )
        throw new Error("Message change unconfirmed.");
      return request;
    },
    onSuccess: (request, captured) => {
      if (!captured.currentView()) return;
      if (request.kind === "edit" && revision.current === request.revision) setEditing(false);
      onChanged();
    },
    onError: (_error, captured) => {
      if (captured.currentView())
        toast.error(
          captured.request.kind === "edit"
            ? "We couldn't confirm that change. Your draft is still here. Refresh the conversation before trying again."
            : "We couldn't confirm that change. Refresh the conversation before trying again.",
        );
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const run = (request: Action) => {
    if (
      pending.current ||
      !scope.isCurrent() ||
      !eligible ||
      m.deleted_at ||
      ((request.kind === "edit" || request.kind === "delete") && m.author_id !== scope.viewerId) ||
      (request.kind === "pin" && !isAdmin) ||
      (readOnly && request.kind !== "bookmark") ||
      (request.kind === "bookmark" && bookmarked === null)
    )
      return;
    pending.current = true;
    action.mutate({
      request,
      currentView: scope.isCurrent,
      viewerId: scope.viewerId,
      messageId: m.id,
      channelId: m.channel_id,
    });
  };

  const isAuthor = !!currentUserId && m.author_id === currentUserId;
  const isDeleted = !!m.deleted_at;

  return (
    <article
      className={`group relative rounded-lg px-3 py-2 -mx-3 hover:bg-muted/40 transition ${
        m.pinned ? "border-l-2 border-primary" : ""
      }`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-medium">{m.author_name ?? "Member"}</span>
        <span className="text-xs text-muted-foreground">{formatWhen(m.created_at)}</span>
        {m.edited_at && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">edited</span>
        )}
        {m.pinned && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            <Pin className="h-2.5 w-2.5 mr-1" /> Pinned
          </Badge>
        )}
      </div>

      {isDeleted ? (
        <p className="mt-0.5 text-sm italic text-muted-foreground">Message removed</p>
      ) : editing ? (
        <div className="mt-1 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => {
              revision.current += 1;
              setDraft(e.target.value);
            }}
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.trim() || action.isPending || readOnly || !eligible}
              onClick={() =>
                run({
                  kind: "edit",
                  body: draft.trim(),
                  revision: revision.current,
                  base: baseBody,
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-0.5 text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
      )}

      {attachments.length > 0 && !isDeleted && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments
            .filter((a) => a.message_id === m.id && a.channel_id === m.channel_id)
            .map((a) => (
              <AttachmentChip key={a.id} attachment={a} />
            ))}
        </div>
      )}

      {!compact && !isDeleted && (replyCount ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => {
            if (scope.isCurrent() && eligible) onReply(m);
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <MessageSquare className="h-3 w-3" />
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </button>
      )}

      {!isDeleted && (
        <div
          className="absolute right-2 top-1.5 hidden group-hover:flex items-center gap-1 rounded-md border bg-background/95 px-1 py-0.5 shadow-sm"
          role="toolbar"
          aria-label="Message actions"
        >
          {!compact && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Reply in thread"
              onClick={() => {
                if (scope.isCurrent() && eligible) onReply(m);
              }}
            >
              <Reply className="h-3.5 w-3.5" />
              <span className="sr-only">Reply in thread</span>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title={
              bookmarked === null
                ? "Bookmarks unavailable"
                : bookmarked
                  ? "Remove bookmark"
                  : "Bookmark"
            }
            onClick={() => run({ kind: "bookmark", bookmarked: !bookmarked })}
            disabled={action.isPending || !eligible || bookmarked === null}
          >
            {bookmarked === null ? (
              <CircleHelp className="h-3.5 w-3.5" />
            ) : bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">
              {bookmarked === null
                ? "Bookmarks unavailable"
                : bookmarked
                  ? "Remove bookmark"
                  : "Bookmark"}
            </span>
          </Button>
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title={m.pinned ? "Unpin" : "Pin"}
              onClick={() => run({ kind: "pin", pinned: !m.pinned })}
              disabled={action.isPending || readOnly || !eligible}
            >
              {m.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              <span className="sr-only">{m.pinned ? "Unpin" : "Pin"}</span>
            </Button>
          )}
          {(isAuthor || onPromote) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" title="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPromote && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (scope.isCurrent() && eligible) onPromote(m);
                    }}
                  >
                    <ListPlus className="h-3.5 w-3.5 mr-2" /> Promote to record…
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <DropdownMenuItem
                    disabled={action.isPending || readOnly || !eligible}
                    onClick={() => {
                      if (scope.isCurrent()) {
                        setBaseBody(m.body);
                        setDraft(m.body);
                        revision.current += 1;
                        setEditing(true);
                      }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <DropdownMenuItem
                    disabled={action.isPending || readOnly || !eligible}
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (
                        scope.isCurrent() &&
                        confirm("Delete this message? This cannot be undone.")
                      )
                        run({ kind: "delete" });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </article>
  );
}

function AttachmentChip({ attachment }: { attachment: ChannelAttachment }) {
  const scope = useChannelViewScope(
    JSON.stringify([
      attachment.id,
      attachment.channel_id,
      attachment.message_id,
      attachment.scan_status,
    ]),
  );
  const pending = useRef(false);
  const dlFn = useServerFn(getAttachmentDownloadUrl);
  const [loading, setLoading] = useState(false);
  const size = useMemo(() => formatSize(attachment.size_bytes), [attachment.size_bytes]);
  const isClean = attachment.scan_status === "clean";
  const statusLabel =
    attachment.scan_status === "pending"
      ? "Scanning…"
      : attachment.scan_status === "deleted"
        ? "Blocked"
        : "Quarantined";
  return (
    <button
      type="button"
      disabled={loading || !isClean}
      title={isClean ? `Download ${attachment.file_name}` : statusLabel}
      onClick={async () => {
        if (pending.current || !isClean || !scope.isCurrent()) return;
        pending.current = true;
        try {
          setLoading(true);
          const { url } = await dlFn({
            data: {
              attachment_id: attachment.id,
              expected_channel_id: attachment.channel_id,
              expected_message_id: attachment.message_id,
              expected_viewer_id: scope.viewerId,
            },
          });
          if (scope.isCurrent()) openChannelAttachment(url);
        } catch {
          if (scope.isCurrent()) toast.error("We couldn't open this attachment. Please try again.");
        } finally {
          pending.current = false;
          if (scope.isWorkspaceCurrent()) setLoading(false);
        }
      }}
      className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition max-w-full"
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[200px]">{attachment.file_name}</span>
      {size && <span className="text-muted-foreground shrink-0">{size}</span>}
      {isClean ? (
        <Download className="h-3 w-3 shrink-0 opacity-60" />
      ) : (
        <span className="text-muted-foreground shrink-0">{statusLabel}</span>
      )}
    </button>
  );
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Loads attachments for a batch of message ids and returns a map by message id.
 */
export function useMessageAttachments(messageIds: string[], channelId?: string | null) {
  const listFn = useServerFn(listMessageAttachments);
  const ids = [...new Set(messageIds)].sort();
  const key = ids.join(",");
  const scope = useChannelViewScope(JSON.stringify([key, channelId]));
  const query = useQuery({
    queryKey: ["channel-message-attachments", channelId, key],
    queryFn: async () => {
      const attachments: ChannelAttachment[] = [];
      for (let start = 0; start < ids.length; start += 200) {
        if (!scope.isCurrent()) throw new Error("Conversation changed.");
        const batch = ids.slice(start, start + 200);
        const result = await listFn({
          data: {
            message_ids: batch,
            expected_channel_id: channelId ?? undefined,
            expected_viewer_id: scope.viewerId,
          },
        });
        if (!scope.isCurrent()) throw new Error("Conversation changed.");
        if (
          !Array.isArray(result?.attachments) ||
          result.attachments.some(
            (attachment) =>
              !z.string().uuid().safeParse(attachment.id).success ||
              !batch.includes(attachment.message_id) ||
              (channelId && attachment.channel_id !== channelId),
          )
        )
          throw new Error("Message attachments unavailable.");
        attachments.push(...result.attachments);
      }
      return { attachments };
    },
    retry: false,
    enabled: messageIds.length > 0,
    // A scan now runs in its own request so sending a message stays responsive.
    // Poll only while a quarantined attachment is pending, then stop as soon as
    // the service-role scanner records clean, deleted, or failed.
    refetchInterval: (current) =>
      current.state.status === "success" &&
      current.state.data?.attachments.some((attachment) => attachment.scan_status === "pending")
        ? 2_500
        : false,
  });
  const byMessage = useMemo(() => {
    const map = new Map<string, ChannelAttachment[]>();
    (query.isSuccess ? (query.data?.attachments ?? []) : []).forEach((a) => {
      const list = map.get(a.message_id) ?? [];
      list.push(a);
      map.set(a.message_id, list);
    });
    return map;
  }, [query.data, query.isSuccess]);
  return { byMessage, refetch: query.refetch, error: query.isError };
}

// Re-export the query client hook location for convenience.
export { useQueryClient };
