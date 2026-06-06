import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, X, ExternalLink, CheckCircle2, Star, Archive, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminListSources,
  adminUpsertSource,
  adminSetSourceStatus,
  adminMarkSourceReviewed,
  adminDeleteSource,
  SOURCE_TYPES,
  LOCATION_SCOPES,
  UPDATE_FREQUENCIES,
  REVIEW_STATUSES,
  SOURCE_AUDIENCES,
  SOURCE_TOPICS,
  type ResourceSource,
} from "@/lib/resource-sources.functions";

export const Route = createFileRoute("/_authenticated/owner/resource-sources")({
  head: () => ({ meta: [{ title: "Source Libraries — Admin Hub" }] }),
  component: SourcesPage,
});

type Draft = Partial<ResourceSource> & { source_name: string; source_type: string };

const emptyDraft = (): Draft => ({
  source_name: "",
  source_url: "",
  organization_name: "",
  description: "",
  source_type: "library",
  audience_focus: [],
  topic_focus: [],
  location_scope: "national",
  update_frequency: "unknown",
  review_status: "approved",
  notes: "",
});

function SourcesPage() {
  const list = useServerFn(adminListSources);
  const upsert = useServerFn(adminUpsertSource);
  const setStatus = useServerFn(adminSetSourceStatus);
  const markReviewed = useServerFn(adminMarkSourceReviewed);
  const del = useServerFn(adminDeleteSource);

  const [sources, setSources] = useState<ResourceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = () => {
    setLoading(true);
    list()
      .then((r) => setSources(r.sources))
      .catch((e) => toast.error(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(
    () => sources.filter((s) => filterStatus === "all" || s.review_status === filterStatus),
    [sources, filterStatus],
  );

  const save = async () => {
    if (!editing) return;
    try {
      await upsert({ data: editing as any });
      toast.success("Source saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const onStatus = async (id: string, status: string) => {
    await setStatus({ data: { id, review_status: status as any } });
    toast.success("Status updated");
    load();
  };

  const onReview = async (id: string) => {
    await markReviewed({ data: { id } });
    toast.success("Marked reviewed");
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this source? Resources linked to it will keep working but lose their source link.")) return;
    await del({ data: { id } });
    toast.success("Source deleted");
    load();
  };

  const toggleArr = (key: "audience_focus" | "topic_focus", val: string) => {
    if (!editing) return;
    const cur = (editing[key] ?? []) as string[];
    setEditing({ ...editing, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] });
  };

  return (
    <OwnerShell
      title="Source Libraries"
      description="Trusted external libraries that resources are curated from."
      actions={
        <Button onClick={() => setEditing(emptyDraft())}>
          <Plus className="h-4 w-4 mr-2" /> Add Source Library
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Review status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{s.source_name}</h3>
                    <Badge variant={s.review_status === "featured" ? "default" : "secondary"}>{s.review_status}</Badge>
                    <Badge variant="outline">{s.source_type}</Badge>
                    <Badge variant="outline">{s.location_scope}</Badge>
                    <span className="text-xs text-muted-foreground">{s.resource_count ?? 0} resources</span>
                  </div>
                  {s.organization_name && <p className="text-xs text-muted-foreground mt-1">{s.organization_name}</p>}
                  {s.description && <p className="text-sm mt-2">{s.description}</p>}
                  {s.source_url && (
                    <a href={s.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-2">
                      <ExternalLink className="h-3 w-3" /> {s.source_url}
                    </a>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Last reviewed: {s.last_reviewed_at ? new Date(s.last_reviewed_at).toLocaleDateString() : "Never"}
                    {s.next_review_due_at && ` · Next due: ${new Date(s.next_review_due_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s as Draft)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => onReview(s.id)}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Mark reviewed
                  </Button>
                  {s.review_status !== "featured" && (
                    <Button size="sm" variant="outline" onClick={() => onStatus(s.id, "featured")}>
                      <Star className="h-3 w-3 mr-1" /> Feature
                    </Button>
                  )}
                  {s.review_status !== "approved" && (
                    <Button size="sm" variant="outline" onClick={() => onStatus(s.id, "approved")}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                  )}
                  {s.review_status !== "archived" && (
                    <Button size="sm" variant="outline" onClick={() => onStatus(s.id, "archived")}>
                      <Archive className="h-3 w-3 mr-1" /> Archive
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(s.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No sources match.</p>}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border rounded-lg w-full max-w-2xl p-6 my-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing.id ? "Edit source" : "Add source library"}</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-3">
              <div><Label>Source name *</Label><Input value={editing.source_name} onChange={(e) => setEditing({ ...editing, source_name: e.target.value })} /></div>
              <div><Label>Organization</Label><Input value={editing.organization_name ?? ""} onChange={(e) => setEditing({ ...editing, organization_name: e.target.value })} /></div>
              <div><Label>URL</Label><Input value={editing.source_url ?? ""} onChange={(e) => setEditing({ ...editing, source_url: e.target.value })} placeholder="https://…" /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={editing.source_type} onValueChange={(v) => setEditing({ ...editing, source_type: v as typeof SOURCE_TYPES[number] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Location</Label>
                  <Select value={editing.location_scope ?? "national"} onValueChange={(v) => setEditing({ ...editing, location_scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCATION_SCOPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Update frequency</Label>
                  <Select value={editing.update_frequency ?? "unknown"} onValueChange={(v) => setEditing({ ...editing, update_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UPDATE_FREQUENCIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Review status</Label>
                  <Select value={editing.review_status ?? "approved"} onValueChange={(v) => setEditing({ ...editing, review_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REVIEW_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Audience focus</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {SOURCE_AUDIENCES.map((a) => (
                    <Badge key={a} variant={(editing.audience_focus ?? []).includes(a) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArr("audience_focus", a)}>{a}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Topic focus</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {SOURCE_TOPICS.map((t) => (
                    <Badge key={t} variant={(editing.topic_focus ?? []).includes(t) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArr("topic_focus", t)}>{t}</Badge>
                  ))}
                </div>
              </div>
              <div><Label>Admin notes</Label><Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}><Save className="h-4 w-4 mr-2" /> Save</Button>
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
