import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Save, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminListTestimonials,
  adminSaveTestimonial,
  adminDeleteTestimonial,
  type Testimonial,
} from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/_authenticated/owner/testimonials")({
  head: () => ({ meta: [{ title: "Testimonials — Admin Hub" }] }),
  component: TestimonialsPage,
});

type Draft = Omit<Testimonial, "id"> & { id?: string };
const empty: Draft = {
  author_name: "",
  role: "",
  organization: "",
  quote: "",
  avatar_url: "",
  rating: 5,
  is_featured: false,
  is_published: true,
  position: 0,
};

function TestimonialsPage() {
  const list = useServerFn(adminListTestimonials);
  const save = useServerFn(adminSaveTestimonial);
  const del = useServerFn(adminDeleteTestimonial);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setItems(r.testimonials);
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
      await save({ data: draft as any });
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
      title="Testimonials"
      description={`${items.length} quotes`}
      actions={
        <Button size="sm" onClick={() => setDraft({ ...empty, position: items.length })}>
          <Plus className="mr-2 h-4 w-4" /> New testimonial
        </Button>
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : items.length === 0 && !draft ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No testimonials yet.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {t.author_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{t.author_name}</span>
                    {t.role && <span className="text-xs text-muted-foreground">{t.role}</span>}
                    {t.is_featured && <span className="text-xs text-primary">★ Featured</span>}
                    {!t.is_published && <span className="text-xs text-amber-600">Hidden</span>}
                  </div>
                  {t.organization && <div className="text-xs text-muted-foreground">{t.organization}</div>}
                  <p className="mt-2 text-sm">"{t.quote}"</p>
                  {t.rating && (
                    <div className="mt-1 flex">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDraft(t as Draft)}>Edit</Button>
                  <Button size="icon" variant="ghost" aria-label="Delete testimonial" onClick={async () => {
                    if (confirm("Delete?")) { await del({ data: { id: t.id } }); refresh(); }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-2xl rounded-t-xl bg-background p-6 shadow-xl sm:rounded-xl">
            <h2 className="mb-4 font-display text-lg font-medium">
              {draft.id ? "Edit testimonial" : "New testimonial"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Author name *</Label>
                <Input value={draft.author_name} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Role / title</Label>
                <Input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Organization</Label>
                <Input value={draft.organization ?? ""} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Avatar URL</Label>
                <Input value={draft.avatar_url ?? ""} onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Quote *</Label>
                <Textarea rows={4} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={draft.rating ?? 5} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) || null })} />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Input type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={draft.is_featured} onCheckedChange={(v) => setDraft({ ...draft, is_featured: v })} />
                <Label className="text-xs">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={draft.is_published} onCheckedChange={(v) => setDraft({ ...draft, is_published: v })} />
                <Label className="text-xs">Published</Label>
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
