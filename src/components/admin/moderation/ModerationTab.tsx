import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, Trash2, Check, X, Gavel, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listChannelReports,
  resolveChannelReport,
  removeChannelMessage,
  setChannelRetention,
  type ModerationReportRow,
} from "@/lib/channel-moderation.functions";

export function ModerationTab() {
  const list = useServerFn(listChannelReports);
  const resolve = useServerFn(resolveChannelReport);
  const removeMsg = useServerFn(removeChannelMessage);
  const setRetention = useServerFn(setChannelRetention);

  const [reports, setReports] = useState<ModerationReportRow[] | null>(null);
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReports(null);
    try {
      const res = await list({ data: { status } });
      setReports(res.reports);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load reports");
      setReports([]);
    }
  }, [list, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleResolve = async (id: string, outcome: "resolved" | "dismissed") => {
    setBusyId(id);
    try {
      await resolve({ data: { report_id: id, outcome } });
      toast.success(outcome === "resolved" ? "Report resolved" : "Report dismissed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (messageId: string, reportId: string) => {
    if (!confirm("Remove this message? This cannot be undone.")) return;
    setBusyId(reportId);
    try {
      await removeMsg({ data: { message_id: messageId, reason: "moderation" } });
      await resolve({ data: { report_id: reportId, outcome: "resolved", note: "Message removed" } });
      toast.success("Message removed and report resolved");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetention = async (channelId: string, patch: { legal_hold?: boolean; retention_days?: number }) => {
    try {
      await setRetention({ data: { channel_id: channelId, ...patch } });
      toast.success("Retention updated");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5" /> Channel Moderation
          </h2>
          <p className="text-sm text-muted-foreground">
            Review reported messages, take action, and manage retention or legal holds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="mod-status" className="text-xs uppercase tracking-wide text-muted-foreground">
            Filter
          </Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger id="mod-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {reports === null ? (
        <div className="flex items-center gap-2 rounded-md border border-border/60 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No reports in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge>
                    <Badge variant="outline">{r.reason}</Badge>
                    {r.channel_kind && <Badge variant="outline">{r.channel_kind}</Badge>}
                    {r.legal_hold && (
                      <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
                        <Gavel className="mr-1 h-3 w-3" /> Legal hold
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Reported {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Reporter:</span>{" "}
                    {r.reporter_name || r.reporter_id.slice(0, 8)}
                    {r.channel_purpose && <span className="text-muted-foreground"> · {r.channel_purpose}</span>}
                  </p>
                  {r.details && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Notes:</span> {r.details}
                    </p>
                  )}
                  {r.message_body ? (
                    <blockquote className="mt-2 rounded-md border-l-2 border-primary/40 bg-muted/40 p-3 text-sm">
                      <div className="mb-1 text-xs text-muted-foreground">
                        {r.message_author_name || r.message_author_id?.slice(0, 8) || "Unknown"}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{r.message_body}</div>
                    </blockquote>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">Message no longer available.</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.status === "open" && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={busyId === r.id}
                      onClick={() => handleResolve(r.id, "resolved")}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => handleResolve(r.id, "dismissed")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Dismiss
                    </Button>
                    {r.message_id && r.message_body && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === r.id}
                        onClick={() => handleRemove(r.message_id!, r.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove message
                      </Button>
                    )}
                  </>
                )}

                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Retention (days)
                  <Input
                    type="number"
                    min={0}
                    defaultValue={r.retention_days}
                    className="h-8 w-24"
                    onBlur={(e) => {
                      const v = Number(e.currentTarget.value);
                      if (Number.isFinite(v) && v !== r.retention_days) {
                        void handleRetention(r.channel_id, { retention_days: v });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant={r.legal_hold ? "default" : "outline"}
                    onClick={() => handleRetention(r.channel_id, { legal_hold: !r.legal_hold })}
                  >
                    <Gavel className="mr-1 h-3.5 w-3.5" />
                    {r.legal_hold ? "Release hold" : "Legal hold"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
