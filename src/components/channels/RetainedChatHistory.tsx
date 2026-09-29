import { useState } from "react";
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
  const list = useServerFn(listMyChatHistory);
  const read = useServerFn(readChatHistory);
  const download = useServerFn(downloadChatHistoryAttachment);
  const [channelId, setChannelId] = useState("");
  const [offset, setOffset] = useState(0);
  const grants = useQuery({
    queryKey: ["retained-chat-history"],
    queryFn: () => list(),
    staleTime: 0,
  });
  const page = useQuery({
    queryKey: ["retained-chat-history", channelId, offset],
    queryFn: () => read({ data: { channel_id: channelId, offset } }),
    enabled: !!channelId,
    staleTime: 0,
  });
  const selected = grants.data?.find((g) => g.channel_id === channelId);
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
      {grants.data?.length === 0 && <p>No retained conversations.</p>}
      <div className="flex flex-wrap gap-2">
        {grants.data?.map((g) => (
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
      {selected && (
        <p className="text-sm">
          History through {new Date(selected.removed_at).toLocaleString()} · Read-only
        </p>
      )}
      {channelId && page.isPending && <p role="status">Loading messages…</p>}
      {page.isError && (
        <p role="alert">
          Could not load messages.{" "}
          <Button variant="link" onClick={() => page.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {selected && page.data && (
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
                      onClick={async () => {
                        try {
                          const { url } = await download({
                            data: { attachment_id: a.attachment_id },
                          });
                          window.location.assign(url);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Download failed.");
                        }
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
