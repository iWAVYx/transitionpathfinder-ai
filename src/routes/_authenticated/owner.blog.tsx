import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  adminListBlogPosts,
  adminSaveBlogPost,
  adminDeleteBlogPost,
  type BlogPost,
} from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/_authenticated/owner/blog")({
  head: () => ({ meta: [{ title: "Blog — Admin Hub" }] }),
  component: BlogPage,
});

type Draft = Omit<BlogPost, "id" | "updated_at"> & { id?: string };
const empty: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  body_markdown: "",
  cover_image_url: "",
  author_name: "",
  category: "",
  tags: [],
  status: "draft",
  published_at: null,
  seo_title: "",
  seo_description: "",
};

function BlogPage() {
  const list = useServerFn(adminListBlogPosts);
  const save = useServerFn(adminSaveBlogPost);
  const del = useServerFn(adminDeleteBlogPost);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setPosts(r.posts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload: any = {
        ...draft,
        excerpt: draft.excerpt || null,
        cover_image_url: draft.cover_image_url || null,
        author_name: draft.author_name || null,
        category: draft.category || null,
        seo_title: draft.seo_title || null,
        seo_description: draft.seo_description || null,
        published_at: draft.published_at || null,
      };
      await save({ data: payload });
      toast.success("Saved");
      setDraft(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OwnerShell
      title="Blog & news"
      description={`${posts.length} posts`}
      actions={
        <Button size="sm" onClick={() => setDraft({ ...empty })}>
          <Plus className="mr-2 h-4 w-4" /> New post
        </Button>
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : posts.length === 0 && !draft ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No blog posts yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={
                      "rounded-full px-2 py-0.5 text-[10px] uppercase " +
                      (p.status === "published" ? "bg-emerald-100 text-emerald-700" :
                       p.status === "archived" ? "bg-muted text-muted-foreground" :
                       "bg-amber-100 text-amber-700")
                    }>{p.status}</span>
                    {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                  </div>
                  <h3 className="mt-1 font-medium">{p.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    /{p.slug} · updated {p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}
                  </div>
                  {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const next = p.status === "published" ? "draft" : "published";
                      try {
                        await save({ data: { ...(p as any), status: next } });
                        toast.success(next === "published" ? "Published" : "Unpublished");
                        refresh();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }}
                  >
                    {p.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft(p as Draft)}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (confirm(`Delete "${p.title}"? This cannot be undone.`)) {
                      try {
                        await del({ data: { id: p.id } });
                        toast.success("Deleted");
                        refresh();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed to delete");
                      }
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-xl bg-background p-6 shadow-xl sm:rounded-xl">
            <h2 className="mb-4 font-display text-lg font-medium">
              {draft.id ? "Edit post" : "New post"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-xs">Title *</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Slug * (lowercase, hyphens)</Label>
                <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="my-post" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Author name</Label>
                <Input value={draft.author_name ?? ""} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Cover image URL</Label>
                <Input value={draft.cover_image_url ?? ""} onChange={(e) => setDraft({ ...draft, cover_image_url: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Excerpt</Label>
                <Textarea rows={2} value={draft.excerpt ?? ""} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Body (Markdown)</Label>
                <Textarea rows={12} value={draft.body_markdown} onChange={(e) => setDraft({ ...draft, body_markdown: e.target.value })} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs">SEO title</Label>
                <Input value={draft.seo_title ?? ""} onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">SEO description</Label>
                <Input value={draft.seo_description ?? ""} onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input
                  value={draft.tags.join(", ")}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
