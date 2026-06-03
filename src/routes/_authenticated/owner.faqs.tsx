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
import { Switch } from "@/components/ui/switch";
import {
  adminListFaqs,
  adminSaveFaq,
  adminDeleteFaq,
  type Faq,
} from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/_authenticated/owner/faqs")({
  head: () => ({ meta: [{ title: "FAQs — Admin Hub" }] }),
  component: FaqsPage,
});

type Draft = Omit<Faq, "id"> & { id?: string };

const empty: Draft = {
  category: "general",
  question: "",
  answer: "",
  position: 0,
  is_published: true,
};

function FaqsPage() {
  const list = useServerFn(adminListFaqs);
  const save = useServerFn(adminSaveFaq);
  const del = useServerFn(adminDeleteFaq);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setFaqs(r.faqs);
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
      await save({ data: draft });
      toast.success("Saved");
      setDraft(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    await del({ data: { id } });
    await refresh();
  };

  return (
    <OwnerShell
      title="FAQs"
      description={`${faqs.length} entries`}
      actions={
        <Button size="sm" onClick={() => setDraft({ ...empty, position: faqs.length })}>
          <Plus className="mr-2 h-4 w-4" /> New FAQ
        </Button>
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <div className="space-y-3">
          {faqs.length === 0 && !draft && (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No FAQs yet. Add one to get started.
            </p>
          )}
          {faqs.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">{f.category}</span>
                    {!f.is_published && <span className="text-amber-600">Hidden</span>}
                  </div>
                  <h3 className="mt-1 font-medium">{f.question}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{f.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDraft(f)}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
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
              {draft.id ? "Edit FAQ" : "New FAQ"}
            </h2>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Position</Label>
                  <Input type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Question</Label>
                <Input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <Textarea rows={6} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
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
