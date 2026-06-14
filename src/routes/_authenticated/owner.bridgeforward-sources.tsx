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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListSchools, adminUpsertSchool, adminArchiveSchool,
  adminListSourceRecords, adminImportSourceRecord, adminReviewSourceRecord,
} from "@/lib/bridgeforward-admin.functions";

export const Route = createFileRoute("/_authenticated/owner/bridgeforward-sources")({
  head: () => ({ meta: [{ title: "BridgeForward Source Manager — Admin Hub" }] }),
  component: SourceManager,
});

const SCHOOL_TYPES = [
  "comprehensive_public","technical_ctecs","magnet","charter",
  "agricultural_aste","open_choice","specialized_program",
  "alternative_program","private_or_out_of_district","other",
] as const;
const STATUSES = ["imported","needs_review","verified","outdated","archived"] as const;

function SourceManager() {
  const qc = useQueryClient();
  const listSchools = useServerFn(adminListSchools);
  const upsert = useServerFn(adminUpsertSchool);
  const archive = useServerFn(adminArchiveSchool);
  const listSources = useServerFn(adminListSourceRecords);
  const importSrc = useServerFn(adminImportSourceRecord);
  const review = useServerFn(adminReviewSourceRecord);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [importJson, setImportJson] = useState("");

  const schools = useQuery({
    queryKey: ["admin-bf-schools", statusFilter, q],
    queryFn: () => listSchools({ data: { status: statusFilter || undefined, q: q || undefined } }),
  });
  const sources = useQuery({
    queryKey: ["admin-bf-sources"],
    queryFn: () => listSources(),
  });

  const saveSchool = useMutation({
    mutationFn: (d: any) => upsert({ data: d }),
    onSuccess: () => {
      toast.success("School saved.");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-bf-schools"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed."),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => {
      toast.success("Archived.");
      qc.invalidateQueries({ queryKey: ["admin-bf-schools"] });
    },
  });

  const importMut = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(importJson || "{}");
      return importSrc({ data: {
        source_name: parsed.source_name ?? "Manual",
        source_url: parsed.source_url ?? null,
        source_type: parsed.source_type ?? null,
        raw: parsed.raw ?? parsed,
        normalized: parsed.normalized ?? {},
      }});
    },
    onSuccess: () => {
      toast.success("Source record imported (needs_review).");
      setImportJson("");
      qc.invalidateQueries({ queryKey: ["admin-bf-sources"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed."),
  });

  const reviewMut = useMutation({
    mutationFn: (v: { id: string; action: any }) =>
      review({ data: { source_record_id: v.id, action: v.action } }),
    onSuccess: () => {
      toast.success("Review recorded.");
      qc.invalidateQueries({ queryKey: ["admin-bf-sources"] });
    },
  });

  return (
    <OwnerShell title="BridgeForward Source Manager">
      <div className="px-4 py-6 sm:px-6">
        <h1 className="font-display text-2xl">BridgeForward Source Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import, review, verify, and archive Connecticut high school records.
        </p>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Import Source Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>Paste raw JSON (source_name required)</Label>
            <Textarea rows={4} value={importJson} onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"source_name":"CSDE EdSight","source_url":"https://...","raw":{"name":"Example HS"}}' />
            <Button onClick={() => importMut.mutate()} disabled={importMut.isPending || !importJson.trim()}>
              Import
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Source Records ({sources.data?.records.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sources.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {sources.data?.records?.length === 0 && <p className="text-sm text-muted-foreground">No source records yet.</p>}
            {sources.data?.records?.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
                <div>
                  <Badge variant="outline">{r.import_status}</Badge>{" "}
                  <span className="font-medium">{r.source_name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(r.imported_at).toLocaleString()}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id: r.id, action: "approve" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id: r.id, action: "needs_changes" })}>Needs Changes</Button>
                  <Button size="sm" variant="outline" onClick={() => reviewMut.mutate({ id: r.id, action: "reject" })}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">CT High Schools ({schools.data?.schools.length ?? 0})</CardTitle>
            <Button size="sm" onClick={() => setDraft({
              name: "", school_type: "comprehensive_public", verification_status: "needs_review",
            })}>+ Add School</Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {schools.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="space-y-1">
              {schools.data?.schools?.map((s: any) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
                  <div>
                    <Badge variant="outline">{s.verification_status}</Badge>{" "}
                    <Badge variant="secondary">{s.school_type}</Badge>{" "}
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.city}{s.county ? `, ${s.county}` : ""}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setDraft(s)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => archiveMut.mutate(s.id)}>Archive</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {draft && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">{draft.id ? "Edit" : "Add"} School</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name</Label><Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label>District</Label><Input value={draft.district ?? ""} onChange={(e) => setDraft({ ...draft, district: e.target.value })} /></div>
              <div><Label>City</Label><Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
              <div><Label>County</Label><Input value={draft.county ?? ""} onChange={(e) => setDraft({ ...draft, county: e.target.value })} /></div>
              <div>
                <Label>School Type</Label>
                <Select value={draft.school_type} onValueChange={(v) => setDraft({ ...draft, school_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCHOOL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verification Status</Label>
                <Select value={draft.verification_status} onValueChange={(v) => setDraft({ ...draft, verification_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Grades Served</Label><Input value={draft.grades_served ?? ""} onChange={(e) => setDraft({ ...draft, grades_served: e.target.value })} /></div>
              <div><Label>Website URL</Label><Input value={draft.website_url ?? ""} onChange={(e) => setDraft({ ...draft, website_url: e.target.value })} /></div>
              <div><Label>Source URL</Label><Input value={draft.source_url ?? ""} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} /></div>
              <div><Label>Source Name</Label><Input value={draft.source_name ?? ""} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Transportation Notes</Label>
                <Textarea rows={2} value={draft.transportation_notes ?? ""} onChange={(e) => setDraft({ ...draft, transportation_notes: e.target.value })} /></div>
              <div className="sm:col-span-2 flex gap-2">
                <Button onClick={() => saveSchool.mutate(draft)} disabled={saveSchool.isPending}>Save</Button>
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerShell>
  );
}
