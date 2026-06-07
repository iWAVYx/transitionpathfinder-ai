import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, MessageCircle, Archive } from "lucide-react";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  listPartnerSubmissions,
  updateSubmissionStatus,
  approveSubmissionToPartner,
} from "@/lib/partner-submissions.functions";

export const Route = createFileRoute("/_authenticated/owner/partner-submissions")({
  head: () => ({ meta: [{ title: "Partner Submissions — Admin Hub" }] }),
  component: PartnerSubmissionsPage,
});

type Submission = {
  id: string;
  organization_name: string;
  organization_type: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  region: string | null;
  services_offered: string | null;
  audience_served: string | null;
  pathway_fit: string | null;
  age_range: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  promoted_partner_id: string | null;
};

const STATUS_TONE: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  declined: "bg-rose-100 text-rose-900",
  needs_more_info: "bg-sky-100 text-sky-900",
  archived: "bg-muted text-foreground",
};

function PartnerSubmissionsPage() {
  const fetchList = useServerFn(listPartnerSubmissions);
  const updateStatus = useServerFn(updateSubmissionStatus);
  const approve = useServerFn(approveSubmissionToPartner);

  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_review");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");

  const refresh = async () => {
    setLoading(true);
    const r = await fetchList();
    setRows(r.submissions as Submission[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) setNotes(selected.admin_notes ?? "");
  }, [selected]);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const setStatus = async (status: string) => {
    if (!selected) return;
    await updateStatus({ data: { id: selected.id, status: status as never, admin_notes: notes } });
    toast.success("Updated");
    await refresh();
    setSelected(null);
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approve({ data: { id: selected.id } });
      toast.success("Promoted to partner record");
      await refresh();
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve");
    }
  };

  return (
    <OwnerShell
      title="Partner Submissions"
      description="Organizations that submitted the Become a Partner form. Approve to promote into a partner record."
    >
      <div className="mt-2 flex flex-wrap gap-2">
        {["pending_review", "needs_more_info", "approved", "declined", "archived", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {s.replace(/_/g, " ")} (
            {s === "all" ? rows.length : rows.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No partner submissions waiting for review.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Organization</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Region</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Submitted</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.organization_name}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.contact_name}
                    <br />
                    <span className="text-muted-foreground">{r.contact_email}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.region ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge className={`${STATUS_TONE[r.status] ?? ""} text-[10px]`}>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.organization_name}</SheetTitle>
              </SheetHeader>
              <dl className="mt-5 grid gap-3 text-sm">
                <Field label="Contact">
                  {selected.contact_name} · {selected.contact_email}
                  {selected.contact_phone ? ` · ${selected.contact_phone}` : ""}
                </Field>
                <Field label="Organization type">{selected.organization_type ?? "—"}</Field>
                <Field label="Website">
                  {selected.website_url ? (
                    <a
                      href={selected.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {selected.website_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Region">{selected.region ?? "—"}</Field>
                <Field label="Pathway fit">{selected.pathway_fit ?? "—"}</Field>
                <Field label="Audience served">{selected.audience_served ?? "—"}</Field>
                <Field label="Age range">{selected.age_range ?? "—"}</Field>
                <Field label="Services offered">{selected.services_offered ?? "—"}</Field>
                <Field label="Message">{selected.message ?? "—"}</Field>
              </dl>

              <div className="mt-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin notes
                </p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={handleApprove} disabled={selected.status === "approved"}>
                  <CheckCircle2 className="h-4 w-4" /> Approve & create partner
                </Button>
                <Button variant="outline" onClick={() => setStatus("needs_more_info")}>
                  <MessageCircle className="h-4 w-4" /> Needs more info
                </Button>
                <Button variant="outline" onClick={() => setStatus("declined")}>
                  <XCircle className="h-4 w-4" /> Decline
                </Button>
                <Button variant="ghost" onClick={() => setStatus("archived")}>
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </div>

              {selected.promoted_partner_id && (
                <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
                  Already promoted to partner record · ID {selected.promoted_partner_id}
                </p>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </OwnerShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}
