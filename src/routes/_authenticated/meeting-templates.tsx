import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save, ClipboardList, Loader2, Target, ShieldAlert } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listMeetingTemplates,
  getMeetingTemplate,
  createMeetingTemplate,
  updateMeetingTemplate,
  deleteMeetingTemplate,
  upsertTemplateItem,
  deleteTemplateItem,
  type MeetingTemplate,
  type MeetingTemplateItem,
} from "@/lib/meeting-templates.functions";

export const Route = createFileRoute("/_authenticated/meeting-templates")({
  head: () => ({
    meta: [
      { title: "Meeting Templates — TransitionForward" },
      {
        name: "description",
        content:
          "Build reusable IEP meeting agendas and compliance checklists tied to transition goals.",
      },
    ],
  }),
  component: Page,
});

const BANDS = [
  { value: "", label: "Any" },
  { value: "early", label: "Pre-transition" },
  { value: "age_14", label: "Age 14+" },
  { value: "age_16", label: "Age 16+" },
  { value: "age_17", label: "Age 17 (rights notice)" },
  { value: "age_18_plus", label: "Age 18+" },
  { value: "exit_year", label: "Exit year" },
];

const KINDS = ["PPT", "IEP", "transition", "other"];
const COMPLIANCE_KEYS = [
  { value: "ct_age_14_planning", label: "CT — Age 14 transition planning" },
  { value: "ct_age_17_notice", label: "CT — Age 17 rights notice" },
  { value: "ct_age_18_decision_making", label: "CT — Age 18 decision-making" },
  { value: "ct_exit_summary", label: "CT — Exit year summary" },
];

function Page() {
  return (
    <RoleGuard path="/meeting-templates" allow={["educator", "admin"]}>
      <SiteShell>
        <PageContainer>
          <Breadcrumbs trail={[{ label: "Meeting Templates" }]} />
          <PageHeader
            eyebrow="Educator"
            title="Meeting Templates"
            description="Build reusable PPT/IEP agendas and checklists. Apply them to any meeting to auto-pull in that student's transition goals and Connecticut compliance milestones."
          />
          <Body />
        </PageContainer>
      </SiteShell>
    </RoleGuard>
  );
}

function Body() {
  const list = useServerFn(listMeetingTemplates);
  const create = useServerFn(createMeetingTemplate);

  const [templates, setTemplates] = useState<MeetingTemplate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const reload = () =>
    list()
      .then((r) => setTemplates(r.templates))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load templates."));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { template } = await create({ data: { name: newName.trim(), kind: "PPT", is_shared: true } });
      setNewName("");
      await reload();
      setSelectedId(template.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create template.");
    }
  }

  if (templates === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <form onSubmit={handleCreate} className="rounded-2xl border bg-card p-4 shadow-soft">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            New template
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Age 14 Transition PPT"
              maxLength={120}
            />
            <Button type="submit" size="icon" aria-label="Create template">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <Section title="Library" description={`${templates.length} template${templates.length === 1 ? "" : "s"}`}>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm shadow-soft transition hover:bg-muted ${
                      selectedId === t.id ? "border-primary bg-primary/5" : "bg-card"
                    }`}
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.kind}
                      {t.recommended_band ? ` · ${t.recommended_band}` : ""}
                      {t.is_shared ? "" : " · Private"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </aside>

      <div>
        {selectedId ? (
          <Editor key={selectedId} templateId={selectedId} onDeleted={() => { setSelectedId(null); reload(); }} onSaved={reload} />
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg">Pick a template to edit</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Or create a new one to start building your agenda and compliance checklist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({
  templateId,
  onDeleted,
  onSaved,
}: {
  templateId: string;
  onDeleted: () => void;
  onSaved: () => void;
}) {
  const get = useServerFn(getMeetingTemplate);
  const update = useServerFn(updateMeetingTemplate);
  const del = useServerFn(deleteMeetingTemplate);
  const upsertItem = useServerFn(upsertTemplateItem);
  const delItem = useServerFn(deleteTemplateItem);

  const [template, setTemplate] = useState<MeetingTemplate | null>(null);
  const [items, setItems] = useState<MeetingTemplateItem[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = () =>
    get({ data: { id: templateId } }).then((r) => {
      setTemplate(r.template);
      setItems(r.items);
    });

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  if (!template) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  async function saveMeta(patch: Partial<MeetingTemplate>) {
    setTemplate({ ...template!, ...patch });
    try {
      await update({ data: { id: template!.id, ...patch } as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete template "${template!.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await del({ data: { id: template!.id } });
      toast.success("Template deleted.");
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <Input
              value={template.name}
              maxLength={120}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              onBlur={(e) => saveMeta({ name: e.target.value })}
              className="text-lg font-display"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="block font-medium text-muted-foreground">Meeting kind</span>
            <select
              value={template.kind}
              onChange={(e) => saveMeta({ kind: e.target.value })}
              className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-medium text-muted-foreground">Recommended band</span>
            <select
              value={template.recommended_band ?? ""}
              onChange={(e) => saveMeta({ recommended_band: e.target.value || null })}
              className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
            >
              {BANDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-medium text-muted-foreground">Sharing</span>
            <select
              value={template.is_shared ? "shared" : "private"}
              onChange={(e) => saveMeta({ is_shared: e.target.value === "shared" })}
              className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="shared">Shared with all educators</option>
              <option value="private">Private (only me)</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-xs">
          <span className="block font-medium text-muted-foreground">Description</span>
          <Textarea
            value={template.description ?? ""}
            maxLength={2000}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            onBlur={(e) => saveMeta({ description: e.target.value || null })}
            placeholder="When to use this template, who should attend, special notes…"
            className="mt-1"
            rows={2}
          />
        </label>
      </div>

      <Section
        title="Agenda & checklist items"
        description="Each item becomes a checkbox on the meeting. Link an item to a compliance milestone so the checklist follows the student's age band."
      >
        <ul className="space-y-2">
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              item={it}
              index={i}
              onSave={async (patch) => {
                try {
                  await upsertItem({ data: { ...patch, id: it.id, template_id: templateId } });
                  await reload();
                  onSaved();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Save failed.");
                }
              }}
              onDelete={async () => {
                try {
                  await delItem({ data: { id: it.id } });
                  await reload();
                  onSaved();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed.");
                }
              }}
            />
          ))}
        </ul>

        <NewItemForm
          onAdd={async (payload) => {
            try {
              await upsertItem({ data: { ...payload, template_id: templateId } });
              await reload();
              onSaved();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Add failed.");
            }
          }}
        />
      </Section>
    </div>
  );
}

function ItemRow({
  item,
  index,
  onSave,
  onDelete,
}: {
  item: MeetingTemplateItem;
  index: number;
  onSave: (patch: {
    title: string;
    notes: string | null;
    links_to: "custom" | "goal" | "compliance";
    compliance_key: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [linksTo, setLinksTo] = useState(item.links_to);
  const [complianceKey, setComplianceKey] = useState(item.compliance_key ?? "");

  const dirty =
    title !== item.title ||
    (notes || "") !== (item.notes || "") ||
    linksTo !== item.links_to ||
    (complianceKey || "") !== (item.compliance_key || "");

  return (
    <li className="rounded-xl border bg-card p-3 shadow-soft">
      <div className="flex items-start gap-2">
        <span className="mt-2 w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground">
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={title}
            maxLength={240}
            onChange={(e) => setTitle(e.target.value)}
            className="font-medium"
          />
          <Textarea
            rows={2}
            value={notes}
            maxLength={2000}
            placeholder="Optional notes for the team"
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={linksTo}
              onChange={(e) => setLinksTo(e.target.value as typeof linksTo)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
              aria-label="Linked to"
            >
              <option value="custom">No link</option>
              <option value="goal">Tied to a transition goal (auto-resolved per student)</option>
              <option value="compliance">Tied to a compliance milestone</option>
            </select>
            {linksTo === "compliance" ? (
              <select
                value={complianceKey}
                onChange={(e) => setComplianceKey(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs"
                aria-label="Compliance milestone"
              >
                <option value="">Select milestone…</option>
                {COMPLIANCE_KEYS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            ) : null}
            {linksTo === "compliance" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <ShieldAlert className="h-3 w-3" /> Compliance
              </Badge>
            ) : linksTo === "goal" ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Target className="h-3 w-3" /> Goal review
              </Badge>
            ) : null}

            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={!dirty || !title.trim()}
                onClick={() =>
                  onSave({
                    title: title.trim(),
                    notes: notes.trim() || null,
                    links_to: linksTo,
                    compliance_key: linksTo === "compliance" ? complianceKey || null : null,
                  })
                }
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete item">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function NewItemForm({
  onAdd,
}: {
  onAdd: (p: {
    title: string;
    notes: string | null;
    links_to: "custom" | "goal" | "compliance";
    compliance_key: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [linksTo, setLinksTo] = useState<"custom" | "goal" | "compliance">("custom");
  const [complianceKey, setComplianceKey] = useState("");

  return (
    <form
      className="mt-3 rounded-xl border border-dashed bg-background p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onAdd({
          title: title.trim(),
          notes: null,
          links_to: linksTo,
          compliance_key: linksTo === "compliance" ? complianceKey || null : null,
        });
        setTitle("");
        setLinksTo("custom");
        setComplianceKey("");
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add agenda item or checklist entry"
          maxLength={240}
          className="min-w-[200px] flex-1"
        />
        <select
          value={linksTo}
          onChange={(e) => setLinksTo(e.target.value as typeof linksTo)}
          className="rounded-md border bg-background px-2 py-2 text-xs"
        >
          <option value="custom">No link</option>
          <option value="goal">Goal review</option>
          <option value="compliance">Compliance</option>
        </select>
        {linksTo === "compliance" ? (
          <select
            value={complianceKey}
            onChange={(e) => setComplianceKey(e.target.value)}
            className="rounded-md border bg-background px-2 py-2 text-xs"
          >
            <option value="">Select milestone…</option>
            {COMPLIANCE_KEYS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        ) : null}
        <Button type="submit" size="sm" disabled={!title.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </form>
  );
}
