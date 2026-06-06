import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Mail, RefreshCw, AlertTriangle, CheckCircle2, Ban, Clock } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { getEmailMonitor } from "@/lib/email-monitor.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/owner/emails")({
  component: EmailMonitorPage,
});

type RangeOpt = "24h" | "7d" | "30d";
type StatusOpt = "all" | "sent" | "failed" | "suppressed" | "pending";

const FAILED = new Set(["failed", "dlq", "bounced", "complained"]);

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400">
        Sent
      </Badge>
    );
  }
  if (FAILED.has(status)) {
    return (
      <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400">
        {status === "bounced" ? "Bounced" : status === "complained" ? "Complaint" : status === "dlq" ? "Failed (DLQ)" : "Failed"}
      </Badge>
    );
  }
  if (status === "suppressed") {
    return (
      <Badge variant="outline" className="border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
        Suppressed
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400">
        Pending
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Mail;
  tone: "default" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-green-600 dark:text-green-400"
      : tone === "danger"
        ? "text-red-600 dark:text-red-400"
        : tone === "warning"
          ? "text-yellow-600 dark:text-yellow-400"
          : tone === "info"
            ? "text-blue-600 dark:text-blue-400"
            : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value.toLocaleString()}</div>
    </Card>
  );
}

const PAGE_SIZE = 50;

function EmailMonitorPage() {
  const fetchMonitor = useServerFn(getEmailMonitor);
  const [range, setRange] = useState<RangeOpt>("7d");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<StatusOpt>("all");
  const [page, setPage] = useState(0);

  const params = useMemo(
    () => ({
      range,
      template: template === "all" ? undefined : template,
      status,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [range, template, status, page],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["email-monitor", params],
    queryFn: () => fetchMonitor({ data: params }),
  });

  const stats = data?.stats ?? { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 };
  const entries = data?.entries ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const onFilterChange = (fn: () => void) => {
    setPage(0);
    fn();
  };

  return (
    <OwnerShell
      title="Email Monitor"
      description="Delivery status, failures, and suppressions for every outbound email."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {data && !data.is_admin ? (
        <div className="text-sm text-muted-foreground">You do not have access to email logs.</div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
              {(["24h", "7d", "30d"] as RangeOpt[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onFilterChange(() => setRange(r))}
                  className={
                    "rounded px-3 py-1 text-xs transition-colors " +
                    (range === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {r === "24h" ? "Last 24h" : r === "7d" ? "Last 7 days" : "Last 30 days"}
                </button>
              ))}
            </div>

            <Select
              value={template}
              onValueChange={(v) => onFilterChange(() => setTemplate(v))}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All templates</SelectItem>
                {(data?.templates ?? []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => onFilterChange(() => setStatus(v as StatusOpt))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Total" value={stats.total} icon={Mail} tone="default" />
            <StatCard label="Sent" value={stats.sent} icon={CheckCircle2} tone="success" />
            <StatCard label="Failed" value={stats.failed} icon={AlertTriangle} tone="danger" />
            <StatCard label="Suppressed" value={stats.suppressed} icon={Ban} tone="warning" />
            <StatCard label="Pending" value={stats.pending} icon={Clock} tone="info" />
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent at</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No emails match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.template_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{e.recipient_email ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                        {e.error_message ?? ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <div className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </OwnerShell>
  );
}
