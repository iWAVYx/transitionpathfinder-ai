import { useState } from "react";
import { Button } from "@/components/ui/button";

type PinnedMessage = { id: string; body: string; author_name: string | null };
export function ChannelPinnedMessages({
  messages,
  onOpen,
}: {
  messages: PinnedMessage[];
  onOpen: (messageId: string) => void;
}) {
  const [limit, setLimit] = useState(10);
  if (!messages.length) return null;
  return (
    <section
      aria-label="Pinned Messages"
      className="border-b bg-muted/30 px-4 py-2 space-y-1 max-h-40 overflow-y-auto"
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        Pinned
      </p>
      {messages.slice(0, limit).map((message) => (
        <button
          key={message.id}
          type="button"
          onClick={() => onOpen(message.id)}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground truncate"
          title={message.body}
        >
          <span className="font-medium text-foreground">{message.author_name ?? "Member"}:</span>{" "}
          {message.body}
        </button>
      ))}
      <p className="text-xs text-muted-foreground">
        Showing {Math.min(limit, messages.length)} of {messages.length} pinned messages.
      </p>
      {limit < messages.length && (
        <Button size="sm" variant="outline" onClick={() => setLimit((value) => value + 10)}>
          Show More Pinned Messages
        </Button>
      )}
    </section>
  );
}
