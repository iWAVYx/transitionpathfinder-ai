import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2, X, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ownerListResources,
  ownerSaveResource,
  ownerDeleteResource,
  RESOURCE_TYPES,
  RESOURCE_AUDIENCES,
  RESOURCE_VERIFIED_STATUSES,
  type ResourceRow,
  type ResourceVerifiedStatus,
} from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/resources")({
  head: () => ({ meta: [{ title: "Resources — Admin Hub" }] }),
  component: ResourcesPage,
});

type Draft = {
  id?: string;
  title: string;
  description: string;
  resource_type: (typeof RESOURCE_TYPES)[number];
  audience: (typeof RESOURCE_AUDIENCES)[number];
  topic: string;
  url: string;
  image_url: string;
  source_name: string;
  estimated_time: string;
  location_scope: string;
  verified_status: ResourceVerifiedStatus;
};

const empty: Draft = {
  title: "",
  description: "",
  resource_type: "article",
  audience: "all",
  topic: "",
  url: "",
  image_url: "",
  source_name: "",
  estimated_time: "",
  location_scope: "national",
  verified_status: "pending",
};

function ResourcesPage() {
  const list = useServerFn(ownerListResources);
  const save = useServerFn(ownerSaveResource);
  const del = useServerFn(ownerDeleteResource);

  const [items, setItems] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const r = await list();
      setItems(r.resources);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.verified_status !== statusFilter) return false;
      if (!q) return true;
      return `${i.title} ${i.description ?? ""} ${i.topic ?? ""} ${i.source_name ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, statusFilter]);

  function openEdit(r: ResourceRow) {
    setDraft({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      resource_type: (r.resource_type as Draft["resource_type"]) ?? "article",
      audience: (r.audience as Draft["audience"]) ?? "all",
      topic: r.topic ?? "",
      url: r.url ?? "",
      image_url: r.image_url ?? "",
      source_name: r.source_name ?? "",
      estimated_time: r.estimated_time ?? "",
      location_scope: r.location_scope ?? "national",
      verified_status: r.verified_status,
    });
  }

  async function togglePublish(r: ResourceRow) {
    const next: ResourceVerifiedStatus =
      r.verified_status === "verified" ? "pending" : "verified";
    try {
      await save({
        data: {
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          resource_type: r.resource_type as any,
          audience: r.audience as any,
          topic: r.topic ?? null,
          url: r.url ?? null,
          image_url: r.image_url ?? null,
          source_name: r.source_name ?? null,
          estimated_time: r.estimated_time ?? null,
          location_scope: r.location_scope,
          verified_status: next,
        },
      });
      setItems((p) => p.map((x) => (x.id === r.id ? { ...x, verified_status: next } : x)));
      toast.success(next === "verified" ? "Published" : "Unpublished");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          title: draft.title,
          description: draft.description || null,
          resource_type: draft.resource_type,
          audience: draft.audience,
          topic: draft.topic || null,
          url: draft.url || null,
          image_url: draft.image_url || null,
          source_name: draft.source_name || null,
          estimated_time: draft.estimated_time || null,
          location_scope: draft.location_scope,
          verified_status: draft.verified_status,
        },
      });
      toast.success("Saved");
      setDraft(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resource?")) return;
    try {
      await del({ data: { id } });
      setItems((p) => p.filter((x) => x.id !== id));
      setDraft(null);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <OwnerShell
      title="Resource Library"
      description={`${items.length} total · ${items.filter((i) => i.verified_status === "verified").length} published`}
      actions={
        <Button size="sm" onClick={() => setDraft({ ...empty })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New resource
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, topic, source…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RESOURCE_VERIFIED_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No resources yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <button
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => openEdit(r)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{r.title}</span>
                      <Badge
                        variant={r.verified_status === "verified" ? "default" : "outline"}
                      >
                        {r.verified_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{r.resource_type}</span>
                    </div>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant={r.verified_status === "verified" ? "outline" : "default"}
                    onClick={() => togglePublish(r)}
                  >
                    {r.verified_status === "verified" ? "Unpublish" : "Publish"}
                  </Button>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={draft.id ? "Edit resource" : "New resource"}>
          <button type="button" aria-label="Close panel" className="flex-1 bg-foreground/30" onClick={() => setDraft(null)} />
          <aside className="flex w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-medium">
                {draft.id ? "Edit resource" : "New resource"}
              </h2>
              <button type="button" aria-label="Close panel" onClick={() => setDraft(null)}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div>
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  maxLength={300}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  maxLength={4000}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={draft.resource_type}
                    onValueChange={(v) =>
                      setDraft({ ...draft, resource_type: v as Draft["resource_type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select
                    value={draft.audience}
                    onValueChange={(v) =>
                      setDraft({ ...draft, audience: v as Draft["audience"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_AUDIENCES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Topic</Label>
                  <Input
                    value={draft.topic}
                    onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estimated time</Label>
                  <Input
                    value={draft.estimated_time}
                    placeholder="e.g. 10 min read"
                    onChange={(e) => setDraft({ ...draft, estimated_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={draft.url}
                  placeholder="https://"
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={draft.image_url}
                  placeholder="https://"
                  onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source</Label>
                  <Input
                    value={draft.source_name}
                    onChange={(e) => setDraft({ ...draft, source_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={draft.verified_status}
                    onValueChange={(v) =>
                      setDraft({ ...draft, verified_status: v as ResourceVerifiedStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_VERIFIED_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                {draft.id ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(draft.id!)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button size="sm" onClick={handleSave} disabled={saving || !draft.title.trim()}>
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </OwnerShell>
  );
}
