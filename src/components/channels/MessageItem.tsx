import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pin,
  PinOff,
  Reply,
  Bookmark,
  BookmarkCheck,
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
  bookmarked: boolean;
  attachments: ChannelAttachment[];
  replyCount?: number;
  onReply: (parent: ChannelMessage) => void;
  onPromote?: (m: ChannelMessage) => void;
  onChanged: () => void;
  compact?: boolean;
};

export function MessageItem({
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
}: MessageItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  useEffect(() => setDraft(m.body), [m.body]);

  const editFn = useServerFn(editChannelMessage);
  const delFn = useServerFn(deleteChannelMessage);
  const pinFn = useServerFn(setMessagePinned);
  const bookmarkFn = useServerFn(toggleBookmark);

  const editMut = useMutation({
    mutationFn: (body: string) => editFn({ data: { message_id: m.id, body } }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const delMut = useMutation({
    mutationFn: () => delFn({ data: { message_id: m.id } }),
    onSuccess: onChanged,
  });
  const pinMut = useMutation({
    mutationFn: (pinned: boolean) => pinFn({ data: { message_id: m.id, pinned } }),
    onSuccess: onChanged,
  });
  const bookMut = useMutation({
    mutationFn: () => bookmarkFn({ data: { message_id: m.id } }),
    onSuccess: onChanged,
  });

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
            onChange={(e) => setDraft(e.target.value)}
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
              disabled={!draft.trim() || editMut.isPending}
              onClick={() => editMut.mutate(draft.trim())}
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
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} />
          ))}
        </div>
      )}

      {!compact && !isDeleted && (replyCount ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => onReply(m)}
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
              onClick={() => onReply(m)}
            >
              <Reply className="h-3.5 w-3.5" />
              <span className="sr-only">Reply in thread</span>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title={bookmarked ? "Remove bookmark" : "Bookmark"}
            onClick={() => bookMut.mutate()}
            disabled={bookMut.isPending}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Bookmark</span>
          </Button>
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title={m.pinned ? "Unpin" : "Pin"}
              onClick={() => pinMut.mutate(!m.pinned)}
              disabled={pinMut.isPending}
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
                  <DropdownMenuItem onClick={() => onPromote(m)}>
                    <ListPlus className="h-3.5 w-3.5 mr-2" /> Promote to record…
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this message? This cannot be undone.")) delMut.mutate();
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
  const dlFn = useServerFn(getAttachmentDownloadUrl);
  const [loading, setLoading] = useState(false);
  const size = useMemo(() => formatSize(attachment.size_bytes), [attachment.size_bytes]);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const { url } = await dlFn({ data: { attachment_id: attachment.id } });
          window.open(url, "_blank", "noopener,noreferrer");
        } finally {
          setLoading(false);
        }
      }}
      className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition max-w-full"
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[200px]">{attachment.file_name}</span>
      {size && <span className="text-muted-foreground shrink-0">{size}</span>}
      <Download className="h-3 w-3 shrink-0 opacity-60" />
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
export function useMessageAttachments(messageIds: string[]) {
  const listFn = useServerFn(listMessageAttachments);
  const key = messageIds.slice().sort().join(",");
  const query = useQuery({
    queryKey: ["channel-message-attachments", key],
    queryFn: () => listFn({ data: { message_ids: messageIds } }),
    enabled: messageIds.length > 0,
  });
  const byMessage = useMemo(() => {
    const map = new Map<string, ChannelAttachment[]>();
    (query.data?.attachments ?? []).forEach((a) => {
      const list = map.get(a.message_id) ?? [];
      list.push(a);
      map.set(a.message_id, list);
    });
    return map;
  }, [query.data]);
  return { byMessage, refetch: query.refetch };
}

// Re-export the query client hook location for convenience.
export { useQueryClient };
