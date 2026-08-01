import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileClock, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getGovernanceAudit,
  labelForAuditEvent,
} from "@/lib/billing/governance.functions";
import {
  auditCsvFilename,
  toAuditCsv,
} from "@/lib/billing/governance-export";

const WINDOWS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last 12 months" },
];

const ALL_EVENTS = "all";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GovernancePanel({ orgId }: { orgId: string }) {
  const [windowDays, setWindowDays] = useState("180");
  const [eventFilter, setEventFilter] = useState(ALL_EVENTS);
  const fetchAudit = useServerFn(getGovernanceAudit);

  const { data, isLoading } = useQuery({
    queryKey: ["governance-audit", orgId, windowDays],
    queryFn: () =>
      fetchAudit({
        data: { organizationId: orgId, windowDays: Number(windowDays) },
      }),
  });

  const visibleEvents = useMemo(() => {
    const rows = data?.events ?? [];
    return eventFilter === ALL_EVENTS
      ? rows
      : rows.filter((row) => row.event === eventFilter);
  }, [data, eventFilter]);

  function downloadCsv() {
    const csv = toAuditCsv(visibleEvents, labelForAuditEvent);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = auditCsvFilename(orgId, Number(windowDays));
    link.click();
    URL.revokeObjectURL(url);
  }


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Entitlement Audit Trail
            </CardTitle>
            <CardDescription>
              Every manual capacity change is recorded here with the written
              reason its administrator supplied. Records cannot be edited or
              deleted.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EVENTS}>All Event Types</SelectItem>
                {(data?.byEvent ?? []).map((row) => (
                  <SelectItem key={row.event} value={row.event}>
                    {labelForAuditEvent(row.event)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={windowDays} onValueChange={setWindowDays}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOWS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={visibleEvents.length === 0}
              onClick={downloadCsv}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit
              records…
            </div>
          ) : !data || data.events.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No manual capacity changes were recorded in this window.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {data.byEvent.map((row) => (
                  <Badge key={row.event} variant="secondary">
                    {labelForAuditEvent(row.event)} · {row.count}
                  </Badge>
                ))}
              </div>
              {visibleEvents.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No records of this type in the selected window.
                </p>
              ) : (
              <ul className="divide-y rounded-lg border">
                {visibleEvents.map((row) => (
                  <li key={row.id} className="space-y-1.5 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileClock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {labelForAuditEvent(row.event)}
                      </span>
                      {row.license_type && (
                        <Badge variant="outline" className="text-[11px]">
                          {row.license_type}
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatWhen(row.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{row.reason}</p>
                  </li>
                ))}
              </ul>
              )}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
