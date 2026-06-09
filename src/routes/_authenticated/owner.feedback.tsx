import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listFeedback,
  updateFeedback,
  convertFeedbackToIssue,
} from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Admin Hub" }] }),
  component: Page,
});

const STATUSES = ["new", "reviewed", "in_progress", "resolved", "archived"] as const;
const TYPES = [
  "bug",
  "confusing",
  "feature_request",
  "missing_resource",
  "missing_partner",
  "data_access",
  "design_usability",
  "general",
] as const;

function Page() {
  const list = useServerFn(listFeedback);
  const upd = useServerFn(updateFeedback);
  const convert = useServerFn(convertFeedbackToIssue);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (type === "all" || r.feedback_type === type) &&
          (status === "all" || r.status === status),
      ),
    [rows, type, status],
  );

  async function setS(id: string, s: string) {
    try {
      await upd({ data: { id, status: s as any } });
      setRows((p) => p.map((r) => (r.id === id ? { ...r, status: s } : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function setNotes(id: string, n: string) {
    try {
      await upd({ data: { id, admin_notes: n } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function toIssue(id: string) {
    try {
      const { issue } = await convert({ data: { feedback_id: id, priority: "P2" } });
      setRows((p) =>
        p.map((r) =>
          r.id === id ? { ...r, linked_issue_id: issue.id, status: "in_progress" } : r,
        ),
      );
      toast.success("Issue created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell title="Feedback" description={`${rows.length} submissions`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          No feedback yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.user_role ?? "—"} · {r.related_page ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.feedback_type.replace(/_/g, " ")}</Badge>
                  <Badge>{r.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={r.status} onValueChange={(v) => setS(r.id, v)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!r.linked_issue_id && (
                  <Button size="sm" variant="outline" onClick={() => toIssue(r.id)}>
                    Convert to issue <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
                {r.linked_issue_id && (
                  <span className="text-xs text-muted-foreground">Linked to issue.</span>
                )}
              </div>
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Admin notes"
                defaultValue={r.admin_notes ?? ""}
                onBlur={(e) => {
                  if ((e.target.value ?? "") !== (r.admin_notes ?? ""))
                    setNotes(r.id, e.target.value);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </OwnerShell>
  );
}
