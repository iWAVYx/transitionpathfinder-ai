import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOCUMENT_PERMISSIONS_UNCONFIRMED, documentPermissionRow } from "@/lib/document-permissions-contract";
import { listDocumentPermissions, grantDocumentPermission, revokeDocumentPermission, type DocumentRow, type DocumentPermissionRow } from "@/lib/documents.functions";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; document: DocumentRow };
const ROLE_LABELS: Record<string, string> = { student: "Students", parent: "Parents", guardian: "Guardians", family: "Families", educator: "Educators", teacher: "Teachers", case_manager: "Case Managers", school_admin: "School Administrators", district_admin: "District Administrators" };

export function DocumentPermissionsDialog(props: Props) {
  const { user, loading } = useAuth();
  if (!props.open || loading || !user) return null;
  return <DocumentPermissionsSession key={`${user.id}:${props.document.id}:${props.document.student_id}:${props.document.updated_at}`} {...props} viewerId={user.id} />;
}

function DocumentPermissionsSession({ onOpenChange, document, viewerId }: Props & { viewerId: string }) {
  const list = useServerFn(listDocumentPermissions);
  const grant = useServerFn(grantDocumentPermission);
  const revoke = useServerFn(revokeDocumentPermission);
  const active = useRef(false), pending = useRef(false);
  const [perms, setPerms] = useState<DocumentPermissionRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const identity = { document_id: document.id, student_id: document.student_id, expected_viewer_id: viewerId, expected_document_updated_at: document.updated_at };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  function confirmRow(value: unknown) {
    const row = documentPermissionRow.parse(value);
    if (row.document_id !== document.id || row.student_id !== document.student_id) throw new Error();
    return row;
  }
  async function reload() {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const result = await list({ data: identity });
      if (!active.current) return;
      const rows = result.permissions.map(confirmRow);
      if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error();
      setPerms(rows); setUnconfirmed(false);
    } catch {
      if (active.current) { setPerms(null); setUnconfirmed(true); }
    } finally { pending.current = false; if (active.current) setBusy(false); }
  }
  useEffect(() => { reload(); }, [list]);

  async function handleGrant() {
    if (pending.current || unconfirmed || !perms || !acknowledged) return;
    const address = email.trim().toLowerCase();
    if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { toast.error("Enter a valid email address."); return; }
    pending.current = true; setBusy(true);
    try {
      const result = await grant({ data: { ...identity, user_email: address, permission_level: "view_document", acknowledge_full_document: true } });
      if (!active.current) return;
      const row = confirmRow(result.permission);
      if (row.role_type !== null || row.user_id === null || row.permission_level !== "view_document" || row.granted_by !== viewerId || perms.some(existing => existing.id === row.id || existing.user_id === row.user_id)) throw new Error();
      setPerms([...perms, row]); setEmail(""); setAcknowledged(false);
      toast.success("Full-document grant added.");
    } catch { if (active.current) { setUnconfirmed(true); toast.error(DOCUMENT_PERMISSIONS_UNCONFIRMED); } }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  async function handleRemove(row: DocumentPermissionRow) {
    if (pending.current || unconfirmed || !perms) return;
    if (!confirm("Remove this document grant? Student-team access and other grants will remain unchanged.")) return;
    pending.current = true; setBusy(true);
    try {
      const result = await revoke({ data: { ...identity, id: row.id, expected_permission_updated_at: row.updated_at } });
      if (!active.current) return;
      const removed = confirmRow(result.permission);
      if (JSON.stringify(removed) !== JSON.stringify(row)) throw new Error();
      setPerms(perms.filter(existing => existing.id !== row.id));
      toast.success("Document grant removed. Other access may still apply.");
    } catch { if (active.current) { setUnconfirmed(true); toast.error(DOCUMENT_PERMISSIONS_UNCONFIRMED); } }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  const blocked = busy || unconfirmed || perms === null;
  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Manage Access · {document.title}</DialogTitle>
        <DialogDescription>Additional document grants are separate from student-team access. Removing a grant does not remove access held through the team or another grant.</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        Share only with people who need this student's information. A full-document grant can expose the original file and its contents. Summary-only, editing and management levels are not available here. Partner-only accounts cannot receive a grant through this form.
      </div>
      {unconfirmed && <div role="alert" className="space-y-2 text-sm"><p>{DOCUMENT_PERMISSIONS_UNCONFIRMED}</p><p>If the document changed, close this window and refresh the documents page.</p><Button size="sm" disabled={busy} onClick={reload}>Refresh Grants</Button></div>}
      <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <div><Label htmlFor="perm-email">Person's Email</Label><Input id="perm-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="them@example.com" maxLength={254} disabled={blocked} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} disabled={blocked} />I intend to share the full document with this person.</label>
        <Button size="sm" onClick={handleGrant} disabled={blocked || !acknowledged} className="w-full sm:w-auto">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Add Full-Document Grant</Button>
        <p className="text-xs text-muted-foreground">The person must already have a TransitionForward account and access to this student. Add new team members from the student’s page first. Existing grants are not replaced; review the list before adding another.</p>
      </div>
      <div className="mt-1"><p className="text-xs font-semibold text-muted-foreground">Current Grants</p>
        {perms === null ? <p className="mt-2 text-sm text-muted-foreground">{unconfirmed ? "The grant list is unavailable." : "Loading grants…"}</p> : perms.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No additional grants. Student-team access is managed separately.</p> : <>
          <p className="mt-2 text-xs text-muted-foreground">Limited and role-wide grants do not provide original-file access. Independent student-team access is managed separately. Remove grants that are no longer needed.</p>
          <ul className="mt-2 divide-y rounded-xl border">{perms.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><div className="min-w-0"><p className="truncate font-medium">{row.user_id ? `Account · ${row.user_id.slice(0, 8)}…` : ROLE_LABELS[row.role_type ?? ""] ?? "Existing Role Grant"}</p><p className="text-xs text-muted-foreground">{row.permission_level === "none" ? "No Additional Access" : row.role_type !== null ? "Role Grant (No Original-File Access)" : ["view_summary", "view_student_friendly_summary", "request_summary"].includes(row.permission_level) ? "Limited Grant (No Original-File Access)" : "Full-Document Grant"}</p></div><Button size="sm" variant="ghost" onClick={() => handleRemove(row)} disabled={blocked} aria-label="Remove Grant"><Trash2 className="h-3.5 w-3.5" /></Button></li>)}</ul>
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}
