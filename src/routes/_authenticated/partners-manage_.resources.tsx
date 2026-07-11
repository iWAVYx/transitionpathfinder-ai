import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Search,
  X,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listPartnerResourcesWithSaved,
  savePartnerResource,
  unsavePartnerResource,
  updatePartnerSavedResource,
} from "@/lib/partnerforward.functions";

type ResourceItem = {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  partner_value: string | null;
  eligibility_notes: string | null;
  action_steps: string | null;
  official_url: string | null;
  source_name: string | null;
  cautious_disclaimer: string | null;
  saved:
    | {
        id: string;
        resource_id: string;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;
};

export const Route = createFileRoute("/_authenticated/partners-manage_/resources")({
  head: () => ({
    meta: [
      { title: "Partner Resources — PartnerForward" },
      {
        name: "description",
        content:
          "Playbooks, templates, and best-practice guides for partner organizations.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/partners-manage">
      <PartnerResourcesPage />
    </RoleGuard>
  ),
});

function PartnerResourcesPage() {
  const fetchList = useServerFn(listPartnerResourcesWithSaved);
  const saveFn = useServerFn(savePartnerResource);
  const unsaveFn = useServerFn(unsavePartnerResource);
  const updateFn = useServerFn(updatePartnerSavedResource);

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("__all__");
  const [savedOnly, setSavedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>("");

  const load = () => {
    setLoading(true);
    setErrored(false);
    fetchList()
      .then((r) => setItems(r.items as ResourceItem[]))
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.category) set.add(it.category);
    return ["__all__", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (activeCategory !== "__all__" && it.category !== activeCategory)
        return false;
      if (savedOnly && !it.saved) return false;
      if (!q) return true;
      const hay = [
        it.title,
        it.summary,
        it.partner_value,
        it.category,
        it.source_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, activeCategory, savedOnly]);

  const savedCount = useMemo(
    () => items.filter((i) => !!i.saved).length,
    [items],
  );

  const handleSave = async (r: ResourceItem) => {
    setBusyId(r.id);
    try {
      await saveFn({ data: { resource_id: r.id } });
      toast.success("Saved to your library");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnsave = async (r: ResourceItem) => {
    if (!r.saved) return;
    setBusyId(r.id);
    try {
      await unsaveFn({ data: { id: r.saved.id } });
      toast.success("Removed");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (r: ResourceItem) => {
    if (!r.saved) return;
    try {
      await updateFn({ data: { id: r.saved.id, notes: editDraft || null } });
      toast.success("Notes updated");
      setEditingId(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Partner Workspace", to: "/partners-manage" },
            { label: "Resources" },
          ]}
        />
        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Partner Resources
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Playbooks, templates, and best-practice guides built for partner
              organizations. Save what your team uses most.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resources"
              className="pl-9"
              aria-label="Search resources"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={
                  activeCategory === c
                    ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                    : "rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:border-primary/60 hover:text-primary"
                }
              >
                {c === "__all__" ? "All" : c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSavedOnly((s) => !s)}
            className={
              savedOnly
                ? "inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                : "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:border-primary/60 hover:text-primary"
            }
          >
            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
            Saved ({savedCount})
          </button>
        </div>

        {loading && (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading resources…
          </div>
        )}

        {errored && !loading && (
          <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't load resources.{" "}
            <button className="underline" onClick={load}>
              Try again
            </button>
            .
          </div>
        )}

        {!loading && !errored && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <BookOpen
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium">No resources match</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try clearing the search or switching category.
            </p>
            <div className="mt-4">
              <Link
                to="/partnerforward"
                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Explore PartnerForward incentives instead →
              </Link>
            </div>
          </div>
        )}

        {!loading && !errored && filtered.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {filtered.map((r) => {
              const isSaved = !!r.saved;
              const editing = editingId === r.id;
              return (
                <Card key={r.id} className="flex h-full flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge variant="secondary" className="mb-2">
                          {r.category}
                        </Badge>
                        <CardTitle className="text-lg font-medium tracking-tight">
                          {r.title}
                        </CardTitle>
                        {r.source_name && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.source_name}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant={isSaved ? "default" : "outline"}
                        aria-label={isSaved ? "Unsave" : "Save"}
                        disabled={busyId === r.id}
                        onClick={() =>
                          isSaved ? handleUnsave(r) : handleSave(r)
                        }
                      >
                        {busyId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSaved ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 pt-0 text-sm">
                    {r.summary && (
                      <p className="text-muted-foreground">{r.summary}</p>
                    )}
                    {r.partner_value && (
                      <p>
                        <span className="font-semibold">Value: </span>
                        {r.partner_value}
                      </p>
                    )}
                    {r.eligibility_notes && (
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Eligibility:{" "}
                        </span>
                        {r.eligibility_notes}
                      </p>
                    )}
                    {r.action_steps && (
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          How to use:{" "}
                        </span>
                        {r.action_steps}
                      </p>
                    )}
                    {r.cautious_disclaimer && (
                      <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                        {r.cautious_disclaimer}
                      </p>
                    )}

                    {isSaved && (
                      <div className="mt-2 rounded-lg border bg-muted/40 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Your notes
                          </p>
                          {editing ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(r)}
                              >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditDraft(r.saved?.notes ?? "");
                              }}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                        {editing ? (
                          <Textarea
                            className="mt-2"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            placeholder="Notes for your team…"
                            rows={3}
                          />
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {r.saved?.notes || (
                              <span className="text-muted-foreground italic">
                                No notes yet.
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-2">
                      {r.official_url && (
                        <a
                          href={r.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Open resource
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </SiteShell>
  );
}
