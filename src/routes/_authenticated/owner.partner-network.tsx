import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Star,
  Eye,
  EyeOff,
  CheckCircle2,
  Briefcase,
  Plus,
  Pencil,
  Archive,
  Trash2,
  X,
} from "lucide-react";
import { z } from "zod";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  listAdminPartners,
  setPartnerStatus,
  listOpportunitiesForPartner,
  upsertOpportunity,
  archiveOpportunity,
  deleteOpportunity,
  opportunityItemSchema,
  bulkInsertOpportunities,
} from "@/lib/partner-network.functions";

export const Route = createFileRoute("/_authenticated/owner/partner-network")({
  head: () => ({ meta: [{ title: "Partner Network — Admin Hub" }] }),
  component: PartnerNetworkAdminPage,
});

type Row = {
  id: string;
  organization_name: string;
  partner_type: string;
  county: string | null;
  city: string | null;
  verification_status: string;
  outreach_status: string;
  is_public: boolean;
  is_featured: boolean;
  collection_tags: string[];
  pathway_categories: string[];
  updated_at: string;
};

type Opportunity = {
  id: string;
  partner_id: string;
  opportunity_title: string;
  opportunity_type: string;
  description: string | null;
  location: string | null;
  county: string | null;
  pathway_category: string | null;
  age_range: string | null;
  eligibility: string | null;
  support_level: string | null;
  schedule: string | null;
  cost_or_funding_notes: string | null;
  application_url: string | null;
  contact_email: string | null;
  next_step: string | null;
  status: string;
  is_public: boolean;
};

const STATUSES = ["all", "verified", "featured", "potential", "needs_review", "archived"] as const;

const OPP_TYPES = [
  "internship",
  "job_shadowing",
  "volunteer_experience",
  "supported_employment",
  "day_program",
  "employment_exploration",
  "employment_enrichment",
  "certificate_program",
  "college_program",
  "technical_training",
  "mentorship",
  "independent_living_support",
  "transportation_support",
  "family_support",
  "agency_connection",
] as const;

const OPP_STATUSES = ["open", "waitlist", "closed", "archived"] as const;

const opportunityItemSchema = z.object({
  opportunity_title: z.string().min(1, "Title is required").max(255, "Max 255 characters"),
  opportunity_type: z.string().refine((v) => OPP_TYPES.includes(v as any), {
    message: `Must be one of: ${OPP_TYPES.join(", ")}`,
  }),
  description: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  location: z.string().max(255).optional().transform((v) => v?.trim() || null),
  county: z.string().max(255).optional().transform((v) => v?.trim() || null),
  pathway_category: z.string().max(255).optional().transform((v) => v?.trim() || null),
  age_range: z.string().max(50).optional().transform((v) => v?.trim() || null),
  eligibility: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  support_level: z.string().max(255).optional().transform((v) => v?.trim() || null),
  schedule: z.string().max(255).optional().transform((v) => v?.trim() || null),
  cost_or_funding_notes: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  application_url: z
    .union([z.string().url("Invalid URL").max(500), z.literal(""), z.null()])
    .optional()
    .transform((v) => v?.trim() || null),
  contact_email: z
    .union([z.string().email("Invalid email").max(255), z.literal(""), z.null()])
    .optional()
    .transform((v) => v?.trim() || null),
  next_step: z.string().max(1000).optional().transform((v) => v?.trim() || null),
  status: z.enum(["open", "waitlist", "closed", "archived"]).optional(),
  is_public: z.boolean().optional(),
});

function emptyOpp(partner_id: string): Opportunity {
  return {
    id: "",
    partner_id,
    opportunity_title: "",
    opportunity_type: "agency_connection",
    description: "",
    location: "",
    county: "",
    pathway_category: "",
    age_range: "",
    eligibility: "",
    support_level: "",
    schedule: "",
    cost_or_funding_notes: "",
    application_url: "",
    contact_email: "",
    next_step: "",
    status: "open",
    is_public: true,
  };
}

function PartnerNetworkAdminPage() {
  const list = useServerFn(listAdminPartners);
  const setStatus = useServerFn(setPartnerStatus);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [oppsPartner, setOppsPartner] = useState<Row | null>(null);
  const [openNewForPartner, setOpenNewForPartner] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  const refresh = () => {
    setRows(null);
    list()
      .then((r) => setRows(r.partners as Row[]))
      .catch(() => setRows([]));
  };
  useEffect(refresh, [list]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (filter !== "all" && r.verification_status !== filter) return false;
      if (q) {
        const hay = `${r.organization_name} ${(r.collection_tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, filter, q]);

  const pickerResults = useMemo(() => {
    const term = pickerQ.toLowerCase().trim();
    const base = rows ?? [];
    if (!term) return base.slice(0, 25);
    return base
      .filter((r) => r.organization_name.toLowerCase().includes(term))
      .slice(0, 25);
  }, [rows, pickerQ]);

  async function update(id: string, patch: Parameters<typeof setStatus>[0]["data"]) {
    setBusy(id);
    try {
      await setStatus({ data: patch });
      toast.success("Updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OwnerShell
      title="Partner Network"
      description="Verify and curate Connecticut transition partners, opportunities, and community resource leads."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70")
            }
          >
            {s}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search organizations…"
            className="max-w-xs"
          />
          <Button size="sm" onClick={() => { setPickerOpen(true); setPickerQ(""); }}>
            <Plus className="mr-1 h-3 w-3" /> Add opportunity
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 p-4 backdrop-blur-sm sm:pt-24"
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-lg border border-border bg-background p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Pick a partner organization</h3>
              <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              autoFocus
              value={pickerQ}
              onChange={(e) => setPickerQ(e.target.value)}
              placeholder="Search…"
            />
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {pickerResults.length === 0 ? (
                <li className="p-3 text-center text-xs text-muted-foreground">
                  No matches.
                </li>
              ) : (
                pickerResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => {
                        setPickerOpen(false);
                        setOpenNewForPartner(true);
                        setOppsPartner(r);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{r.organization_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.verification_status}
                      </Badge>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}


      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No partners match.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Organization</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Outreach</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.organization_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(r.pathway_categories ?? []).slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.partner_type}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[r.city, r.county].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{r.verification_status}</Badge>
                    {r.is_featured && (
                      <Badge className="ml-1 bg-primary/15 text-primary">Featured</Badge>
                    )}
                    {!r.is_public && (
                      <Badge variant="outline" className="ml-1">
                        Hidden
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.outreach_status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOppsPartner(r)}
                      >
                        <Briefcase className="mr-1 h-3 w-3" /> Opportunities
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() =>
                          update(r.id, { id: r.id, verification_status: "verified" })
                        }
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => update(r.id, { id: r.id, is_featured: !r.is_featured })}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        {r.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => update(r.id, { id: r.id, is_public: !r.is_public })}
                      >
                        {r.is_public ? (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Publish
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OpportunitiesDrawer
        partner={oppsPartner}
        autoOpenNew={openNewForPartner}
        onClose={() => { setOppsPartner(null); setOpenNewForPartner(false); }}
      />
    </OwnerShell>
  );
}


function OpportunitiesDrawer({
  partner,
  autoOpenNew = false,
  onClose,
}: {
  partner: Row | null;
  autoOpenNew?: boolean;
  onClose: () => void;
}) {
  const listOpps = useServerFn(listOpportunitiesForPartner);
  const saveOpp = useServerFn(upsertOpportunity);
  const archiveOpp = useServerFn(archiveOpportunity);
  const removeOpp = useServerFn(deleteOpportunity);

  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [bulkValid, setBulkValid] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!partner) {
      setOpps(null);
      setEditing(null);
      setBulkOpen(false);
      setBulkText("");
      setBulkErrors([]);
      setBulkValid([]);
      return;
    }
    setOpps(null);
    if (autoOpenNew) setEditing(emptyOpp(partner.id));
    listOpps({ data: { partner_id: partner.id } })
      .then((r) => setOpps(r.opportunities as Opportunity[]))
      .catch(() => setOpps([]));
  }, [partner, listOpps]);

  function reload() {
    if (!partner) return;
    listOpps({ data: { partner_id: partner.id } })
      .then((r) => setOpps(r.opportunities as Opportunity[]))
      .catch(() => setOpps([]));
  }

  async function handleSave() {
    if (!editing || !partner) return;
    if (!editing.opportunity_title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      const { id, ...rest } = editing;
      const values: Record<string, unknown> = {
        ...rest,
        partner_id: partner.id,
      };
      // Strip empty strings to null for optional text fields
      for (const k of Object.keys(values)) {
        if (typeof values[k] === "string" && (values[k] as string).trim() === "") {
          values[k] = null;
        }
      }
      await saveOpp({ data: { id: id || undefined, values } });
      toast.success(id ? "Opportunity updated" : "Opportunity created");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(o: Opportunity) {
    setBusyId(o.id);
    try {
      await archiveOpp({
        data: { id: o.id, status: o.status === "archived" ? "open" : "archived" },
      });
      toast.success(o.status === "archived" ? "Restored" : "Archived");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Permanently delete "${o.opportunity_title}"?`)) return;
    setBusyId(o.id);
    try {
      await removeOpp({ data: { id: o.id } });
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Sheet open={!!partner} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{partner?.organization_name}</SheetTitle>
          <SheetDescription>
            Manage opportunity listings — internships, day programs, agency connections, and more.
          </SheetDescription>
        </SheetHeader>

        {editing ? (
          <OpportunityForm
            value={editing}
            onChange={setEditing}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {opps === null ? "Loading…" : `${opps.length} opportunit${opps.length === 1 ? "y" : "ies"}`}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkOpen((v) => !v)}
                >
                  Paste JSON
                </Button>
                <Button
                  size="sm"
                  onClick={() => partner && setEditing(emptyOpp(partner.id))}
                >
                  <Plus className="mr-1 h-3 w-3" /> New
                </Button>
              </div>
            </div>

            {bulkOpen && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Paste a JSON array of opportunities. Each must include{" "}
                  <code>opportunity_title</code> and <code>opportunity_type</code>.
                </p>
                <Textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    setBulkErrors([]);
                    setBulkValid([]);
                  }}
                  placeholder='[{"opportunity_title":"…","opportunity_type":"internship","description":"…","location":"Hartford","county":"Hartford"}]'
                  className="font-mono text-xs"
                />
                {bulkErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 space-y-1">
                    <p className="text-xs font-semibold text-destructive">
                      Validation failed ({bulkErrors.length} issue{bulkErrors.length === 1 ? "" : "s"})
                    </p>
                    <ul className="max-h-40 overflow-y-auto space-y-0.5">
                      {bulkErrors.map((err, i) => (
                        <li key={i} className="text-[11px] text-destructive">
                          Row {err.row + 1} · <span className="font-medium">{err.field}</span> · {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {bulkValid.length > 0 && bulkErrors.length === 0 && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <p className="text-xs font-medium text-emerald-600">
                      {bulkValid.length} valid record{bulkValid.length === 1 ? "" : "s"} ready to import
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setBulkOpen(false); setBulkText(""); setBulkErrors([]); setBulkValid([]); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!bulkText.trim()}
                    onClick={() => {
                      setBulkErrors([]);
                      setBulkValid([]);
                      let parsed: unknown;
                      try {
                        parsed = JSON.parse(bulkText);
                        if (!Array.isArray(parsed)) throw new Error("Must be an array");
                        if (parsed.length === 0) throw new Error("Array is empty");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Invalid JSON");
                        return;
                      }
                      const errors: { row: number; field: string; message: string }[] = [];
                      const valid: Record<string, unknown>[] = [];
                      parsed.forEach((item, idx) => {
                        const result = opportunityItemSchema.safeParse(item);
                        if (!result.success) {
                          result.error.issues.forEach((issue) => {
                            errors.push({ row: idx, field: issue.path.join("."), message: issue.message });
                          });
                        } else {
                          valid.push(result.data);
                        }
                      });
                      setBulkErrors(errors);
                      setBulkValid(valid);
                      if (errors.length === 0) {
                        toast.success(`${valid.length} record${valid.length === 1 ? "" : "s"} validated`);
                      }
                    }}
                  >
                    Validate & Preview
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkSaving || bulkErrors.length > 0 || bulkValid.length === 0}
                    onClick={async () => {
                      if (!partner || bulkValid.length === 0) return;
                      setBulkSaving(true);
                      let ok = 0, fail = 0;
                      for (const values of bulkValid) {
                        const payload = {
                          partner_id: partner.id,
                          status: "open",
                          is_public: true,
                          ...values,
                        };
                        try {
                          await saveOpp({ data: { values: payload } });
                          ok++;
                        } catch { fail++; }
                      }
                      setBulkSaving(false);
                      toast.success(`Imported ${ok}${fail ? ` (${fail} failed)` : ""}`);
                      setBulkText("");
                      setBulkOpen(false);
                      setBulkErrors([]);
                      setBulkValid([]);
                      reload();
                    }}
                  >
                    {bulkSaving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Import {bulkValid.length > 0 ? `(${bulkValid.length})` : ""}
                  </Button>
                </div>
              </div>
            )}


            {opps === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : opps.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No opportunities yet. Click "New" to add one.
              </p>
            ) : (
              <ul className="space-y-2">
                {opps.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{o.opportunity_title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {o.opportunity_type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              "text-[10px] " +
                              (o.status === "archived"
                                ? "bg-muted text-muted-foreground"
                                : o.status === "closed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-primary/10 text-primary")
                            }
                          >
                            {o.status}
                          </Badge>
                          {!o.is_public && (
                            <Badge variant="outline" className="text-[10px]">
                              Hidden
                            </Badge>
                          )}
                        </div>
                        {o.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {o.description}
                          </p>
                        )}
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {[o.location, o.county, o.pathway_category, o.age_range]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(o)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === o.id}
                          onClick={() => handleArchive(o)}
                          title={o.status === "archived" ? "Restore" : "Archive"}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === o.id}
                          onClick={() => handleDelete(o)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OpportunityForm({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  value: Opportunity;
  onChange: (v: Opportunity) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof Opportunity>(k: K, v: Opportunity[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {value.id ? "Edit opportunity" : "New opportunity"}
        </h3>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="opp-title">Title *</Label>
          <Input
            id="opp-title"
            value={value.opportunity_title}
            onChange={(e) => set("opportunity_title", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select
              value={value.opportunity_type}
              onValueChange={(v) => set("opportunity_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={value.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="opp-desc">Description</Label>
          <Textarea
            id="opp-desc"
            rows={3}
            value={value.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Location</Label>
            <Input
              value={value.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div>
            <Label>County</Label>
            <Input
              value={value.county ?? ""}
              onChange={(e) => set("county", e.target.value)}
            />
          </div>
          <div>
            <Label>Pathway category</Label>
            <Input
              value={value.pathway_category ?? ""}
              onChange={(e) => set("pathway_category", e.target.value)}
              placeholder="employment, postsecondary, …"
            />
          </div>
          <div>
            <Label>Age range</Label>
            <Input
              value={value.age_range ?? ""}
              onChange={(e) => set("age_range", e.target.value)}
              placeholder="14-22"
            />
          </div>
          <div>
            <Label>Support level</Label>
            <Input
              value={value.support_level ?? ""}
              onChange={(e) => set("support_level", e.target.value)}
            />
          </div>
          <div>
            <Label>Schedule</Label>
            <Input
              value={value.schedule ?? ""}
              onChange={(e) => set("schedule", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Eligibility</Label>
          <Textarea
            rows={2}
            value={value.eligibility ?? ""}
            onChange={(e) => set("eligibility", e.target.value)}
          />
        </div>

        <div>
          <Label>Cost / funding notes</Label>
          <Textarea
            rows={2}
            value={value.cost_or_funding_notes ?? ""}
            onChange={(e) => set("cost_or_funding_notes", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Application URL</Label>
            <Input
              value={value.application_url ?? ""}
              onChange={(e) => set("application_url", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={value.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Next step</Label>
          <Input
            value={value.next_step ?? ""}
            onChange={(e) => set("next_step", e.target.value)}
            placeholder="e.g. Email coordinator to schedule a tour"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label className="text-sm">Public</Label>
            <p className="text-xs text-muted-foreground">
              Show in the public partner directory.
            </p>
          </div>
          <Switch
            checked={value.is_public}
            onCheckedChange={(v) => set("is_public", v)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {value.id ? "Save changes" : "Create"}
        </Button>
      </div>
    </div>
  );
}
