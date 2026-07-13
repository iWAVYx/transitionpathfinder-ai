import { createFileRoute, Link } from "@tanstack/react-router";
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkX,
  ExternalLink,
  Folder,
  Pencil,
  Save,
  Search,
  X,
} from "lucide-react";

import {
  listSavedResources,
  unsaveResource,
  updateSavedResource,
  type SavedResourceRow,
} from "@/lib/saved-resources.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/resources/saved")({
  head: () => ({
    meta: [
      { title: "Saved Resources — TransitionForward" },
      {
        name: "description",
        content: "Your saved transition resources, organized into collections.",
      },
    ],
  }),
  component: SavedResourcesPage,
});

function SavedResourcesPage() {
  const fetchList = useServerFn(listSavedResources);
  const removeFn = useServerFn(unsaveResource);
  const updateFn = useServerFn(updateSavedResource);

  const [items, setItems] = useState<SavedResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<string>("__all__");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ collection: string; notes: string }>({
    collection: "",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    setErrored(false);
    fetchList()
      .then((r) => setItems(r.items))
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const collections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const k = it.collection_name?.trim() || "Saved";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const inCol =
        activeCollection === "__all__" ||
        (it.collection_name?.trim() || "Saved") === activeCollection;
      if (!inCol) return false;
      if (!q) return true;
      const hay = [
        it.resource?.title,
        it.resource?.description,
        it.resource?.topic,
        it.resource?.source_name,
        it.notes,
        it.collection_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, activeCollection]);

  const handleRemove = async (row: SavedResourceRow) => {
    const prev = items;
    setItems((cur) => cur.filter((x) => x.id !== row.id));
    try {
      await removeFn({ data: { resource_id: row.resource_id } });
      toast.success("Removed from saved");
    } catch {
      setItems(prev);
      toast.error("Could not remove. Try again.");
    }
  };

  const startEdit = (row: SavedResourceRow) => {
    setEditingId(row.id);
    setEditDraft({
      collection: row.collection_name?.trim() || "Saved",
      notes: row.notes ?? "",
    });
  };

  const saveEdit = async (row: SavedResourceRow) => {
    const collection = editDraft.collection.trim() || "Saved";
    const notes = editDraft.notes.trim();
    const patch = {
      id: row.id,
      collection_name: collection,
      notes: notes.length > 0 ? notes : null,
    };
    const prev = items;
    setItems((cur) =>
      cur.map((x) =>
        x.id === row.id ? { ...x, collection_name: collection, notes: patch.notes } : x,
      ),
    );
    setEditingId(null);
    try {
      await updateFn({ data: patch });
      toast.success("Updated");
    } catch {
      setItems(prev);
      toast.error("Could not update. Try again.");
    }
  };

  return (
    <main
      data-testid="saved-resources-main"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Resource Library
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Saved Resources
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75">
          Everything you've saved across TransitionForward, organized into your collections.
          Edit, group, or browse back to the full Resource Library when you need more.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background"
          >
            Browse all resources
          </Link>
          <BackToDashboard />

        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, notes, topic…"
            className="pl-9"
            aria-label="Search saved resources"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {items.length} total · {filtered.length} shown
        </p>
      </div>

      {collections.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Collections">
          <CollectionChip
            label="All"
            count={items.length}
            active={activeCollection === "__all__"}
            onClick={() => setActiveCollection("__all__")}
          />
          {collections.map(([name, count]) => (
            <CollectionChip
              key={name}
              label={name}
              count={count}
              active={activeCollection === name}
              onClick={() => setActiveCollection(name)}
            />
          ))}
        </div>
      ) : null}

      {loading ? (
        <SkeletonList />
      ) : errored ? (
        <ErrorBlock onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-center text-sm text-foreground/70">
          No matches. Try a different search or collection.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const r = row.resource;
            const isEditing = editingId === row.id;
            return (
              <li
                key={row.id}
                className="rounded-2xl border bg-card p-4 shadow-soft transition hover:shadow-lift sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <Folder className="h-3 w-3" />
                        {row.collection_name?.trim() || "Saved"}
                      </span>
                      {r?.resource_type ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
                          {r.resource_type.replace(/_/g, " ")}
                        </span>
                      ) : null}
                      {r?.topic ? (
                        <span className="rounded-full bg-muted px-2 py-0.5">{r.topic}</span>
                      ) : null}
                    </div>
                    <h2 className="mt-1.5 font-display text-lg font-medium leading-snug tracking-tight">
                      {r?.title ?? "Untitled resource"}
                    </h2>
                    {r?.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/75">
                        {r.description}
                      </p>
                    ) : null}
                    {r?.source_name ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Source: {r.source_name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r?.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-background"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingId(null) : startEdit(row))}
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={isEditing ? "Cancel edit" : "Edit collection or notes"}
                    >
                      {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(row)}
                      className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove from saved"
                    >
                      <BookmarkX className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 grid gap-2 rounded-xl border border-dashed bg-background/50 p-3">
                    <label className="text-xs font-medium text-foreground/80">
                      Collection
                      <Input
                        value={editDraft.collection}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, collection: e.target.value }))
                        }
                        maxLength={80}
                        className="mt-1"
                        placeholder="e.g. PPT prep"
                      />
                    </label>
                    <label className="text-xs font-medium text-foreground/80">
                      Notes
                      <Textarea
                        value={editDraft.notes}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, notes: e.target.value }))
                        }
                        maxLength={500}
                        rows={3}
                        className="mt-1"
                        placeholder="Why this matters, who to share with…"
                      />
                    </label>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => saveEdit(row)}>
                        <Save className="mr-1.5 h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : row.notes ? (
                  <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm italic text-foreground/80">
                    "{row.notes}"
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function CollectionChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/15 bg-background/70 text-foreground/75 hover:bg-background")
      }
    >
      {label}
      <span
        className={
          "rounded-full px-1.5 text-[10px] " +
          (active ? "bg-primary-foreground/20" : "bg-muted")
        }
      >
        {count}
      </span>
    </button>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-24 animate-pulse rounded-2xl border bg-card shadow-soft"
        />
      ))}
    </ul>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center dark:bg-amber-950/20">
      <p className="font-medium">Couldn't load your saved resources.</p>
      <p className="mt-1 text-sm text-foreground/70">
        Check your connection and try again. Your data is safe.
      </p>
      <Button className="mt-3" onClick={onRetry} variant="outline">
        Try again
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bookmark className="h-6 w-6" />
      </div>
      <h2 className="mt-3 font-display text-xl font-medium">Nothing saved yet</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Tap "Save" on any resource to keep it here for later.
      </p>
      <Link
        to="/resources"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-lift"
      >
        Browse resources
      </Link>
    </div>
  );
}
