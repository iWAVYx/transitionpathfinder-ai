import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Inbox } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getMyChannelDigestPrefs,
  setChannelDigestPrefs,
} from "@/lib/channel-notifications.functions";

type Freq = "off" | "daily" | "weekly";

export function ChannelDigestCard() {
  const getFn = useServerFn(getMyChannelDigestPrefs);
  const setFn = useServerFn(setChannelDigestPrefs);
  const [freq, setFreq] = useState<Freq>("daily");
  const [mentions, setMentions] = useState(true);
  const [assignments, setAssignments] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFn()
      .then((r) => {
        setFreq((r.channel_digest_frequency as Freq) ?? "daily");
        setMentions(r.channel_mentions_email ?? true);
        setAssignments(r.channel_assignments_email ?? true);
      })
      .catch(() => {});
  }, [getFn]);

  async function save(patch: {
    channel_digest_frequency?: Freq;
    channel_mentions_email?: boolean;
    channel_assignments_email?: boolean;
  }) {
    setBusy(true);
    try {
      await setFn({ data: patch });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">Transition Channel Emails</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose how often we email a summary of channel activity, and whether
        mentions and assignments break through immediately.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["off", "daily", "weekly"] as const).map((c) => {
          const active = freq === c;
          return (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => {
                setFreq(c);
                save({ channel_digest_frequency: c });
              }}
              className={
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-60 " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {c === "off" ? "Off" : c === "daily" ? "Daily digest" : "Weekly digest"}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 divide-y divide-border">
        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">Email me when I'm @mentioned</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sent even when digests are off. Muted channels are excluded.
            </p>
          </div>
          <Switch
            checked={mentions}
            disabled={busy}
            onCheckedChange={(v) => {
              setMentions(v);
              save({ channel_mentions_email: v });
            }}
          />
        </li>
        <li className="flex items-start justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">Email me new action assignments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When someone promotes a message into an action assigned to you.
            </p>
          </div>
          <Switch
            checked={assignments}
            disabled={busy}
            onCheckedChange={(v) => {
              setAssignments(v);
              save({ channel_assignments_email: v });
            }}
          />
        </li>
      </ul>
    </div>
  );
}
