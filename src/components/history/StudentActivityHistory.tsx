import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  FileText,
  ShieldCheck,
  Users2,
  Download,
  Eye,
  Pencil,
  UserPlus,
  UserMinus,
  Calendar as CalendarIcon,
  ClipboardList,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HISTORY_FILTERS as FILTERS,
  classifyEntry,
  humanizeAction,
  actorLabel,
  type HistoryFilterKey,
} from "@/lib/history-display";
import { HistoryPrintPreview, type PreparedHistory } from "./HistoryPrintPreview";
import { createHistoryCsv } from "@/lib/history-export";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { HistoryStudent, HistoryOrganization } from "@/lib/organization-history.types";
import {
  listHistoryStudents,
  listStudentAuditPage,
  exportStudentAuditRecords,
  type AuditCursor,
  type AuditEntry,
} from "@/lib/audit.functions";

export type { HistoryFilterKey } from "@/lib/history-display";

/* -------------------- filters -------------------- */

function entryIcon(entry: AuditEntry) {
  const bucket = classifyEntry(entry);
  const a = (entry.action || "").toLowerCase();
  if (a.includes("download")) return Download;
  if (a.includes("view")) return Eye;
  if (a.includes("edit") || a.includes("update")) return Pencil;
  if (a.includes("invite") || a.includes("grant")) return UserPlus;
  if (a.includes("revoke") || a.includes("remove")) return UserMinus;
  if (bucket === "documents") return FileText;
  if (bucket === "sharing") return ShieldCheck;
  if (bucket === "meetings") return CalendarIcon;
  if (bucket === "plan") return ClipboardList;
  return Sparkles;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/* -------------------- component -------------------- */

export type StudentActivityHistoryProps = {
  roster?: HistoryStudent[];
  requestedStudentId?: string;
  onStudentSelection?: (id?: string) => void;
  organization?: HistoryOrganization;
  /**
   * Optional CTA route shown in the empty state (e.g. sharing settings for
   * families, caseload for educators). Falls back to /dashboard.
   */
  emptyCta?: { label: string; to: string };
  /** Optional testId for the outer container. */
  testId?: string;
  /**
   * Optional slot rendered under the list, e.g. a role-specific "see
   * something unexpected?" hint.
   */
  footer?: React.ReactNode;
};

export function RoutedStudentActivityHistory(props: StudentActivityHistoryProps) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const mountedPath = useRef(location.pathname);
  const currentLocation = useRef(location);
  currentLocation.current = location;
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const requested = (location.search as Record<string, unknown>).student_id;
  const requestedStudentId = typeof requested === "string" ? requested : undefined;
  const onStudentSelection = (id?: string) => {
    if (!alive.current || currentLocation.current.pathname !== mountedPath.current) return;
    void navigate({
      to: mountedPath.current,
      search: (previous: Record<string, unknown>) => ({ ...previous, student_id: id }),
      hash: currentLocation.current.hash,
      resetScroll: false,
    });
  };
  if (location.pathname !== mountedPath.current) return null;
  return (
    <StudentActivityHistory
      {...props}
      requestedStudentId={requestedStudentId}
      onStudentSelection={onStudentSelection}
    />
  );
}

export function StudentActivityHistory(props: StudentActivityHistoryProps) {
  const loadStudents = useServerFn(listHistoryStudents);
  const [students, setStudents] = useState<HistoryStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setStudents([]);
    setStudentId("");
    void (async () => {
      try {
        if (props.roster) {
          setStudents(props.roster);
          setStudentId(props.roster[0]?.id ?? "");
          return;
        }
        const result = await loadStudents();
        if (cancelled) return;
        if (result.loadFailed) throw new Error("Student records could not be loaded.");
        setStudents(result.students);
        setStudentId(result.students[0]?.id ?? "");
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStudents, attempt, props.roster]);

  if (loading)
    return (
      <div
        data-testid={props.testId}
        role="status"
        className="flex items-center gap-2 text-foreground/75"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading student records…
      </div>
    );
  if (error)
    return (
      <div data-testid={props.testId}>
        <HistoryLoadFailure
          message="Student records could not be loaded. Please try again."
          onRetry={() => setAttempt((value) => value + 1)}
        />
      </div>
    );
  const activeStudentId = props.onStudentSelection
    ? (props.requestedStudentId ?? students[0]?.id ?? "")
    : studentId;
  if (
    props.requestedStudentId &&
    !students.some((student) => student.id === props.requestedStudentId)
  ) {
    return (
      <div role="alert" className="rounded-lg border p-4 text-sm">
        <p>The selected student is not available in this history view.</p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => props.onStudentSelection?.(undefined)}
        >
          Choose an Available Student
        </Button>
      </div>
    );
  }
  if (!students.length)
    return (
      <div data-testid={props.testId}>
        <EmptyState
          title="No Student Record Available"
          body="Once a student is linked to your account, their access history shows here."
          cta={props.emptyCta ?? { label: "Go to dashboard", to: "/dashboard" }}
        />
      </div>
    );

  // A newly selected student starts with a fresh reader, filters and empty counts.
  return (
    <StudentHistoryReader
      key={`${props.organization?.scope ?? "personal"}:${props.organization?.id ?? ""}:${activeStudentId}`}
      {...props}
      students={students}
      studentId={activeStudentId}
      onStudentChange={props.onStudentSelection ?? setStudentId}
    />
  );
}

function StudentHistoryReader({
  students,
  studentId,
  onStudentChange,
  organization,
  emptyCta,
  testId,
  footer,
}: StudentActivityHistoryProps & {
  students: HistoryStudent[];
  studentId: string;
  onStudentChange: (id: string) => void;
}) {
  const loadAudit = useServerFn(listStudentAuditPage);
  const exportRecords = useServerFn(exportStudentAuditRecords);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [nextCursor, setNextCursor] = useState<AuditCursor | null>(null);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const pageBusy = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const exportBusy = useRef(false);
  const exportGeneration = useRef(0);
  const [prepared, setPrepared] = useState<PreparedHistory | null>(null);
  const [tab, setTab] = useState<HistoryFilterKey>("all");

  const activeFilter = useRef(tab);
  activeFilter.current = tab;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setEntries([]);
    setNextCursor(null);
    setOlderError(false);
    void (async () => {
      try {
        const result = await loadAudit({
          data: { student_id: studentId, limit: 200, ...(organization ? { organization } : {}) },
        });
        if (!cancelled) {
          setEntries(result.entries);
          setNextCursor(result.next_cursor ?? null);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, organization?.scope, organization?.id, loadAudit, attempt]);

  const loadOlder = async () => {
    if (!alive.current || pageBusy.current || !nextCursor) return;
    pageBusy.current = true;
    setOlderLoading(true);
    setOlderError(false);
    try {
      const result = await loadAudit({
        data: {
          student_id: studentId,
          limit: 200,
          ...(organization ? { organization } : {}),
          cursor: nextCursor,
        },
      });
      if (!alive.current) return;
      setEntries((previous) => {
        const known = new Set(previous.map((entry) => entry.id));
        return [...previous, ...result.entries.filter((entry) => !known.has(entry.id))];
      });
      setNextCursor(result.next_cursor ?? null);
    } catch {
      if (alive.current) setOlderError(true);
    } finally {
      if (alive.current) {
        pageBusy.current = false;
        setOlderLoading(false);
      }
    }
  };

  const counts = useMemo(() => {
    const c: Record<HistoryFilterKey, number> = {
      all: entries.length,
      documents: 0,
      sharing: 0,
      meetings: 0,
      plan: 0,
    };
    for (const e of entries) {
      const b = classifyEntry(e);
      if (b !== "all") c[b] += 1;
    }
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    if (tab === "all") return entries;
    return entries.filter((e) => classifyEntry(e) === tab);
  }, [entries, tab]);

  const downloadSelection = async (format: "csv" | "preview" | "print") => {
    if (
      !alive.current ||
      exportBusy.current ||
      loading ||
      error ||
      olderLoading ||
      !filtered.length ||
      filtered.length > 10000
    )
      return;
    const ticket = ++exportGeneration.current;
    const requestedFilter = tab;
    const loadedCount = entries.length;
    const olderAvailable = !!nextCursor;
    exportBusy.current = true;
    setExporting(true);
    setExportError(false);
    try {
      const result = await exportRecords({
        data: {
          student_id: studentId,
          filter: requestedFilter,
          entry_ids: filtered.map((entry) => entry.id),
          ...(organization ? { organization } : {}),
        },
      });
      if (
        !alive.current ||
        activeFilter.current !== requestedFilter ||
        ticket !== exportGeneration.current
      )
        return;
      const context = {
        filter: requestedFilter,
        loadedCount,
        olderAvailable,
        exportedAt: new Date().toISOString(),
      };
      if (format !== "csv") {
        setPrepared({ records: result, context, printNow: format === "print" });
        return;
      }
      const csv = createHistoryCsv(result, context);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = "transitionforward-loaded-activity.csv";
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch {
      if (
        alive.current &&
        activeFilter.current === requestedFilter &&
        ticket === exportGeneration.current
      )
        setExportError(true);
    } finally {
      if (alive.current) {
        exportBusy.current = false;
        setExporting(false);
      }
    }
  };

  const activeStudent = students.find((s) => s.id === studentId) ?? null;
  const cta = emptyCta ?? { label: "Go to dashboard", to: "/dashboard" };

  return (
    <div data-testid={testId}>
      {students.length > 1 ? (
        <div className="mb-6 max-w-sm">
          <label
            htmlFor="history-student"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Student
          </label>
          <Select value={studentId} onValueChange={onStudentChange}>
            <SelectTrigger id="history-student" className="mt-1">
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name ?? ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <p className="mb-4 text-sm text-foreground/75">
        Recent activity{activeStudent ? ` for ${activeStudent.first_name}` : ""}. This view loads up
        to 200 records at a time. Counts and filters apply to the {entries.length} loaded records.
      </p>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={
              loading ||
              error ||
              olderLoading ||
              exporting ||
              !filtered.length ||
              filtered.length > 10000
            }
            onClick={() => void downloadSelection("csv")}
          >
            {exporting ? "Preparing Activity Export…" : "Export Loaded Activity (CSV)"}
          </Button>
          <Button
            variant="outline"
            disabled={
              loading ||
              error ||
              olderLoading ||
              exporting ||
              !filtered.length ||
              filtered.length > 10000
            }
            onClick={() => void downloadSelection("preview")}
          >
            Prepare Printable History
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Exports the selected category from your loaded records, with a fresh access check. Private
          record details are excluded.
        </p>
        {filtered.length > 10000 && (
          <p className="mt-2 text-sm">
            Choose a smaller category to export up to 10,000 loaded records.
          </p>
        )}
        {exportError && (
          <p role="alert" className="mt-2 text-sm">
            Activity could not be exported. Please try again.
          </p>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          ++exportGeneration.current;
          setPrepared(null);
          setExportError(false);
          setTab(v as HistoryFilterKey);
        }}
      >
        <TabsList className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key} className="gap-2">
              {f.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {counts[f.key] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTERS.map((f) => (
          <TabsContent key={f.key} value={f.key} className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
              </div>
            ) : error ? (
              <HistoryLoadFailure
                message="History could not be loaded. Please try again."
                onRetry={() => setAttempt((value) => value + 1)}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No Recent Activity Available"
                body={
                  activeStudent
                    ? `No recent ${
                        f.key === "all" ? "" : f.label.toLowerCase() + " "
                      }activity is available in this view for ${activeStudent.first_name}.`
                    : "No recent activity is available in this view."
                }
                cta={cta}
              />
            ) : (
              <ol className="divide-y rounded-lg border bg-card">
                {filtered.map((e) => {
                  const Icon = entryIcon(e);
                  return (
                    <li key={e.id} className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="font-medium">{humanizeAction(e)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatWhen(e.created_at)}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Users2 className="h-3.5 w-3.5" />
                          <span>{actorLabel(e)}</span>
                          <Badge variant="outline" className="ml-1">
                            {classifyEntry(e)}
                          </Badge>
                        </div>
                        {e.metadata &&
                        typeof e.metadata === "object" &&
                        !Array.isArray(e.metadata) &&
                        Object.keys(e.metadata as object).length > 0 ? (
                          <details className="mt-2 text-xs text-muted-foreground">
                            <summary className="cursor-pointer select-none">Details</summary>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/40 p-2 text-[11px] leading-snug">
                              {JSON.stringify(e.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {!loading && !error && nextCursor && (
        <div className="mt-4">
          {olderError && (
            <p role="alert" className="mb-2 text-sm">
              Older activity could not be loaded. Your loaded records are still available. Please
              try again.
            </p>
          )}
          <Button variant="outline" disabled={olderLoading} onClick={() => void loadOlder()}>
            {olderLoading
              ? "Loading Older Activity…"
              : olderError
                ? "Retry Older Activity"
                : "Load Older Activity"}
          </Button>
        </div>
      )}
      {!loading && !error && !nextCursor && entries.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No older recorded activity is available in this view.
        </p>
      )}
      {prepared && (
        <HistoryPrintPreview
          prepared={prepared}
          busy={exporting}
          failed={exportError}
          onClose={() => {
            ++exportGeneration.current;
            setPrepared(null);
          }}
          onPrint={() => void downloadSelection("print")}
        />
      )}
      {footer}
    </div>
  );
}

function HistoryLoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border p-5">
      <p className="text-sm text-foreground/75">{message}</p>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
