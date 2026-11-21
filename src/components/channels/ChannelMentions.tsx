import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { listMyMentions, markMentionSeen, type ChannelMention } from "@/lib/channel-tabs.functions";
import { useChannelViewScope } from "./ChannelQueryBoundary";
const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const mentionSchema = z.object({
  id: z.string().uuid(),
  channel_id: z.string().uuid(),
  message_id: z.string().uuid(),
  author_id: z.string(),
  author_name: z.string().nullable(),
  mentioned_user_id: z.string(),
  channel_title: z.string(),
  channel_kind: z.string(),
  message_body: z.string(),
  seen_at: timestamp.nullable(),
  created_at: timestamp,
});
const listSchema = z.object({ mentions: z.array(mentionSchema), hasMore: z.boolean() });
const seenSchema = z.object({
  ok: z.literal(true),
  mention_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  message_id: z.string().uuid(),
  seen_at: timestamp,
});
export function ChannelMentions() {
  const scope = useChannelViewScope("mentions");
  const load = useServerFn(listMyMentions);
  const latest = useRef(0);
  const query = useQuery({
    queryKey: ["channel-mentions"],
    queryFn: async () => {
      if (!scope.isCurrent()) throw new Error("Sign-in changed.");
      const request = ++latest.current;
      const result = listSchema.parse(await load({ data: { expected_viewer_id: scope.viewerId } }));
      if (!scope.isCurrent() || request !== latest.current)
        throw new Error("Mention view changed.");
      if (
        result.mentions.some((mention) => mention.mentioned_user_id !== scope.viewerId) ||
        new Set(result.mentions.map((mention) => mention.id)).size !== result.mentions.length
      )
        throw new Error("Mention response mismatch.");
      return result;
    },
    retry: false,
  });
  const mentions = query.isSuccess ? query.data.mentions : [];
  return (
    <section className="space-y-2" aria-label="Your Mentions">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            if (scope.isCurrent()) void query.refetch();
          }}
        >
          Refresh Mentions
        </Button>
      </div>
      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>We couldn't load your mentions.</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Reload Mentions
          </Button>
        </div>
      ) : query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading mentions…</p>
      ) : mentions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mentions yet.</p>
      ) : (
        <>
          {query.data?.hasMore && (
            <p className="text-xs text-muted-foreground">
              Showing the 50 most recent mentions. Older mentions are not shown in this view.
            </p>
          )}
          {mentions.map((mention) => (
            <MentionRow
              key={`${mention.id}:${mention.channel_id}:${mention.message_id}`}
              mention={mention}
            />
          ))}
        </>
      )}
    </section>
  );
}
function MentionRow({ mention }: { mention: ChannelMention }) {
  const scope = useChannelViewScope(
    JSON.stringify([
      mention.id,
      mention.channel_id,
      mention.message_id,
      mention.seen_at,
      mention.mentioned_user_id,
    ]),
  );
  const mark = useServerFn(markMentionSeen),
    qc = useQueryClient();
  const pending = useRef(false),
    acknowledged = useRef(false);
  const [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(false);
  const update = useMutation({
    mutationFn: async (request: {
      currentView: () => boolean;
      data: Parameters<typeof mark>[0]["data"];
    }) => {
      if (!request.currentView()) throw new Error("Mention changed.");
      const result = seenSchema.parse(await mark({ data: request.data }));
      if (
        result.mention_id !== request.data.mention_id ||
        result.channel_id !== request.data.expected_channel_id ||
        result.message_id !== request.data.expected_message_id
      )
        throw new Error("Mention response mismatch.");
      return result;
    },
    onSuccess: (_result, request) => {
      if (!request.currentView()) return;
      acknowledged.current = true;
      setConfirmed(true);
      void qc.invalidateQueries({ queryKey: ["channel-mentions"] });
      void qc.invalidateQueries({ queryKey: ["channel-tile-summary"] });
    },
    onError: (_error, request) => {
      if (request.currentView()) setError(true);
    },
    onSettled: () => {
      pending.current = false;
    },
  });
  const submit = () => {
    if (pending.current || acknowledged.current || mention.seen_at || !scope.isCurrent()) return;
    pending.current = true;
    setError(false);
    update.mutate({
      currentView: scope.isCurrent,
      data: {
        mention_id: mention.id,
        expected_channel_id: mention.channel_id,
        expected_message_id: mention.message_id,
        expected_viewer_id: scope.viewerId,
      },
    });
  };
  return (
    <article className="rounded-lg border p-3 hover:bg-muted/40 transition">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {mention.author_name ?? "Member"} mentioned you in {mention.channel_title}
        </p>
        <span className="text-xs text-muted-foreground">
          {new Date(mention.created_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{mention.message_body}</p>
      {mention.seen_at || confirmed ? (
        <p className="mt-2 text-xs text-muted-foreground">Seen</p>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-7 px-2 text-xs"
          disabled={update.isPending}
          onClick={submit}
        >
          Mark Seen
        </Button>
      )}
      {error && (
        <div role="alert" className="mt-2 space-y-2 text-sm">
          <p>
            We couldn't confirm this mention was marked seen. Reload your mentions before trying
            again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (scope.isCurrent()) void qc.invalidateQueries({ queryKey: ["channel-mentions"] });
            }}
          >
            Reload Mentions
          </Button>
        </div>
      )}
    </article>
  );
}
