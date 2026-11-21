import { useChannelViewScope } from "./ChannelQueryBoundary";
import { openHistoryAttachment } from "@/lib/channel-history-download.browser";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listMyChatHistory,
  readChatHistory,
  downloadChatHistoryAttachment,
} from "@/lib/channel-history.functions";

export function RetainedChatHistory() {
  const workspace = useChannelViewScope("retained-history");
  const list = useServerFn(listMyChatHistory);
  const read = useServerFn(readChatHistory);
  const download = useServerFn(downloadChatHistoryAttachment);
  const [channelId, setChannelId] = useState("");
  const [offset, setOffset] = useState(0);
  const grants = useQuery({
    queryKey: ["retained-chat-history"],
    queryFn: async () => {
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      const result = await list({ data: { expected_viewer_id: workspace.viewerId } });
      if (!workspace.isWorkspaceCurrent()) throw new Error("Your sign-in changed.");
      if (!Array.isArray(result)) throw new Error("History unavailable");
      return result;
    },
    retry: false,
    staleTime: 0,
  });
  const selected = grants.isSuccess
    ? grants.data?.find((grant) => grant.channel_id === channelId)
    : undefined;
  const view = useChannelViewScope(
    JSON.stringify([channelId, offset, selected?.removed_at ?? null, grants.isSuccess]),
  );
  const pendingDownloads = useRef(new Set<string>());
  const [downloading, setDownloading] = useState<string[]>([]);
  const page = useQuery({
    queryKey: ["retained-chat-history", channelId, offset, selected?.removed_at ?? null],
    queryFn: async () => {
      if (!view.isCurrent() || !selected) throw new Error("History selection changed.");
      const result = await read({
        data: { channel_id: channelId, offset, expected_viewer_id: workspace.viewerId },
      });
      if (!view.isCurrent()) throw new Error("History selection changed.");
      if (
        result?.channel_id !== channelId ||
        result.offset !== offset ||
        !Array.isArray(result.messages) ||
        !Array.isArray(result.attachments)
      )
        throw new Error("History response mismatch");
      return result;
    },
    enabled: !!selected,
    staleTime: 0,
    retry: false,
  });
  const downloadAttachment = async (attachmentId: string) => {
    if (
      !view.isCurrent() ||
      !selected ||
      !page.isSuccess ||
      !page.data.attachments.some((attachment) => attachment.attachment_id === attachmentId)
    )
      return;
    const key = JSON.stringify([channelId, offset, selected.removed_at, attachmentId]);
    if (pendingDownloads.current.has(key)) return;
    pendingDownloads.current.add(key);
    setDownloading([...pendingDownloads.current]);
    try {
      const result = await download({
        data: { attachment_id: attachmentId, expected_viewer_id: workspace.viewerId },
      });
      if (!view.isCurrent()) return;
      if (typeof result?.url !== "string") throw new Error("Attachment unavailable");
      openHistoryAttachment(result.url);
    } catch {
      if (view.isCurrent())
        toast.error(
          "We couldn't download this attachment. Please try again from the current history view.",
        );
    } finally {
      pendingDownloads.current.delete(key);
      if (workspace.isWorkspaceCurrent()) setDownloading([...pendingDownloads.current]);
    }
  };
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Retained chat history</h2>
      <p className="text-sm text-muted-foreground">
        Read-only copies shared with you when your membership ended. Later messages and edits are
        not included. Messages removed by moderation or retention are no longer available.
      </p>
      {grants.isPending && <p role="status">Loading history…</p>}
      {grants.isError && (
        <p role="alert">
          Could not load history.{" "}
          <Button variant="link" onClick={() => grants.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {grants.isSuccess && grants.data?.length === 0 && <p>No retained conversations.</p>}
      <div className="flex flex-wrap gap-2">
        {grants.isSuccess &&
          grants.data?.map((g) => (
            <Button
              key={g.channel_id}
              variant={channelId === g.channel_id ? "default" : "outline"}
              onClick={() => {
                setChannelId(g.channel_id);
                setOffset(0);
              }}
            >
              {g.title}
            </Button>
          ))}
      </div>
      {channelId && grants.isSuccess && !selected && (
        <p role="status" className="text-sm">
          This retained conversation is no longer available. Choose another conversation or reload
          history.
        </p>
      )}
      {selected && (
        <p className="text-sm">
          History through {new Date(selected.removed_at).toLocaleString()} · Read-only
        </p>
      )}
      {selected && page.isPending && <p role="status">Loading messages…</p>}
      {selected && page.isError && (
        <p role="alert">
          Could not load messages.{" "}
          <Button variant="link" onClick={() => page.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {selected && page.isSuccess && page.data && (
        <>
          <ol className="space-y-4">
            {[...page.data.messages].reverse().map((m) => (
              <li key={m.message_id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {m.author_name} · {new Date(m.sent_at).toLocaleString()}
                  {m.parent_id ? " · Reply" : ""}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {page.data.attachments
                  .filter((a) => a.message_id === m.message_id)
                  .map((a) => (
                    <Button
                      key={a.attachment_id}
                      variant="link"
                      disabled={downloading.includes(
                        JSON.stringify([channelId, offset, selected.removed_at, a.attachment_id]),
                      )}
                      onClick={() => {
                        void downloadAttachment(a.attachment_id);
                      }}
                    >
                      {a.file_name}
                    </Button>
                  ))}
              </li>
            ))}
          </ol>
          {page.data.messages.length === 0 && <p>No retained messages on this page.</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Newer
            </Button>
            <Button
              variant="outline"
              disabled={!page.data.hasMore}
              onClick={() => setOffset(offset + 50)}
            >
              Older
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
