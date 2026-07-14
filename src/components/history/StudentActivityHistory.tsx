import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  listStudentAuditTrail,
  type AuditEntry,
} from "@/lib/audit.functions";

/* -------------------- filters -------------------- */

export type HistoryFilterKey =
  | "all"
  | "documents"
  | "sharing"
  | "meetings"
  | "plan";

const FILTERS: { key: HistoryFilterKey; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "documents", label: "Documents" },
  { key: "sharing", label: "Sharing & consent" },
  { key: "meetings", label: "Meetings" },
  { key: "plan", label: "Plan & goals" },
];

function classifyEntry(entry: AuditEntry): HistoryFilterKey {
  const t = (entry.entity_type || "").toLowerCase();
  const a = (entry.action || "").toLowerCase();
  if (
    t.includes("document") ||
    t.includes("upload") ||
    t.includes("storage") ||
    a.includes("download") ||
    a.includes("upload") ||
    a.includes("view_document")
  )
    return "documents";
  if (
    t.includes("permission") ||
    t.includes("share") ||
    t.includes("consent") ||
    t.includes("collaborator") ||
    t.includes("relationship") ||
    a.includes("grant") ||
    a.includes("revoke") ||
    a.includes("invite")
  )
    return "sharing";
  if (t.includes("meeting") || t.includes("agenda") || t.includes("ppt"))
    return "meetings";
  if (
    t.includes("goal") ||
    t.includes("plan") ||
    t.includes("pathway") ||
    t.includes("action_item") ||
    t.includes("student")
  )
    return "plan";
  return "all";
}

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

function humanizeAction(entry: AuditEntry): string {
  const a = entry.action.replace(/[_.]/g, " ").toLowerCase();
  const t = entry.entity_type.replace(/[_.]/g, " ").toLowerCase();
  return `${a.charAt(0).toUpperCase() + a.slice(1)}${t ? ` — ${t}` : ""}`;
}

function actorLabel(entry: AuditEntry): string {
  if (entry.actor_email) return entry.actor_email;
  if (entry.actor_id) return "Team member";
  return "System";
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

export function StudentActivityHistory({
  emptyCta,
  testId,
  footer,
}: StudentActivityHistoryProps) {
  const loadStudents = useServerFn(listStudents);
  const loadAudit = useServerFn(listStudentAuditTrail);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HistoryFilterKey>("all");

  useEffect(() => {
    loadStudents()
      .then(({ students }) => {
        setStudents(students);
        if (students[0]) setStudentId(students[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadAudit({ data: { student_id: studentId, limit: 200 } })
      .then(({ entries }) => setEntries(entries))
      .catch(() => toast.error("Could not load history"))
      .finally(() => setLoading(false));
  }, [studentId, loadAudit]);

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

  const activeStudent = students.find((s) => s.id === studentId) ?? null;
  const cta = emptyCta ?? { label: "Go to dashboard", to: "/dashboard" };

  if (students.length === 0 && !loading) {
    return (
      <div data-testid={testId}>
        <EmptyState
          title="No student record available"
          body="Once a student is linked to your account, their access history shows here."
          cta={cta}
        />
      </div>
    );
  }

  return (
    <div data-testid={testId}>
      {students.length > 1 ? (
        <div className="mb-6 max-w-sm">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Student
          </label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="mt-1">
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as HistoryFilterKey)}>
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
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Nothing to show yet"
                body={
                  activeStudent
                    ? `No ${
                        f.key === "all" ? "" : f.label.toLowerCase() + " "
                      }activity recorded yet for ${activeStudent.first_name}.`
                    : "No activity recorded yet."
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
                          <div className="font-medium">
                            {humanizeAction(e)}
                          </div>
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
                            <summary className="cursor-pointer select-none">
                              Details
                            </summary>
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

      {footer}
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
