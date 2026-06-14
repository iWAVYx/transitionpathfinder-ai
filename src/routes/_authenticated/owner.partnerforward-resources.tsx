import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminListResources, adminUpsertResource, adminArchiveResource,
} from "@/lib/partnerforward-admin.functions";

export const Route = createFileRoute("/_authenticated/owner/partnerforward-resources")({
  head: () => ({ meta: [{ title: "PartnerForward Resource Manager — Admin Hub" }] }),
  component: PfResourceManager,
});

const CATEGORIES = [
  "tax_credit","tax_deduction","grant","workforce_program",
  "accessibility_support","inclusive_hiring","disability_awareness_training",
  "vocational_rehabilitation","sponsorship","technical_assistance",
  "funding_opportunity","employer_support","other",
] as const;
const SOURCE_TYPES = ["federal","state_ct","local","nonprofit","workforce_board","foundation","internal"] as const;
const STATUSES = ["draft","needs_review","verified","published","archived"] as const;

function PfResourceManager() {
  const qc = useQueryClient();
  const list = useServerFn(adminListResources);
  const upsert = useServerFn(adminUpsertResource);
  const archive = useServerFn(adminArchiveResource);

  const resources = useQuery({ queryKey: ["pf-admin-resources"], queryFn: () => list() });

  const empty = {
    title: "", category: "other", summary: "", partner_value: "",
    eligibility_notes: "", action_steps: "", official_url: "",
    source_name: "", source_type: null as any,
    status: "draft" as any, legal_financial_disclaimer_required: false,
    cautious_disclaimer: "",
  };
  const [draft, setDraft] = useState<any>(null);

  const save = useMutation({
    mutationFn: (d: any) => upsert({ data: d }),
    onSuccess: () => { toast.success("Resource saved."); setDraft(null); qc.invalidateQueries({ queryKey: ["pf-admin-resources"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed."),
  });
  const arch = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => { toast.success("Archived."); qc.invalidateQueries({ queryKey: ["pf-admin-resources"] }); },
  });

  return (
    <OwnerShell>
      <div className="px-4 py-6 sm:px-6">
        <h1 className="font-display text-2xl">PartnerForward Resource Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage incentives, grants, credits, and support resources surfaced to partners. Use cautious language and link to official sources.
        </p>

        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={() => setDraft({ ...empty })}>+ New Resource</Button>
        </div>

        {resources.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
        <div className="mt-4 space-y-2">
          {resources.data?.resources?.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{r.status}</Badge>
                    <Badge variant="secondary">{r.category}</Badge>
                    {r.legal_financial_disclaimer_required && <Badge>Disclaimer</Badge>}
                  </div>
                  <CardTitle className="mt-1 text-sm">{r.title}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setDraft({ ...r })}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => arch.mutate(r.id)}>Archive</Button>
                </div>
              </CardHeader>
              {r.summary && <CardContent className="text-xs text-muted-foreground">{r.summary}</CardContent>}
            </Card>
          ))}
        </div>

        {draft && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">{draft.id ? "Edit" : "New"} Resource</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Title</Label><Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Source Name</Label><Input value={draft.source_name ?? ""} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></div>
              <div>
                <Label>Source Type</Label>
                <Select value={draft.source_type ?? ""} onValueChange={(v) => setDraft({ ...draft, source_type: v || null })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Official URL</Label><Input value={draft.official_url ?? ""} onChange={(e) => setDraft({ ...draft, official_url: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Summary</Label><Textarea rows={2} value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Partner Value</Label><Textarea rows={2} value={draft.partner_value ?? ""} onChange={(e) => setDraft({ ...draft, partner_value: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Eligibility Notes</Label><Textarea rows={3} value={draft.eligibility_notes ?? ""} onChange={(e) => setDraft({ ...draft, eligibility_notes: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Action Steps</Label><Textarea rows={3} value={draft.action_steps ?? ""} onChange={(e) => setDraft({ ...draft, action_steps: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Cautious Disclaimer</Label><Textarea rows={2} value={draft.cautious_disclaimer ?? ""} onChange={(e) => setDraft({ ...draft, cautious_disclaimer: e.target.value })} /></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch checked={!!draft.legal_financial_disclaimer_required} onCheckedChange={(v) => setDraft({ ...draft, legal_financial_disclaimer_required: v })} />
                <Label>Legal/financial disclaimer required</Label>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button onClick={() => save.mutate(draft)} disabled={save.isPending || !draft.title?.trim()}>Save</Button>
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerShell>
  );
}
