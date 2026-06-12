import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listDocumentPermissions,
  grantDocumentPermission,
  revokeDocumentPermission,
  type DocumentRow,
  type DocumentPermissionRow,
} from "@/lib/documents.functions";

type Level = DocumentPermissionRow["permission_level"];

const LEVEL_LABEL: Record<Level, string> = {
  none: "No access",
  view_summary: "View AI summary only",
  view_student_friendly_summary: "View student-friendly summary",
  view_document: "View full document",
  edit_metadata: "View + edit document details",
  manage: "Manage (view, edit, share)",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRow;
};

/**
 * Per-document access manager. Lets the document owner grant or revoke access
 * to specific people (by email) on top of the student-scoped baseline.
 * Partners are intentionally excluded — IEPs are never shared with the partner role.
 */
export function DocumentPermissionsDialog({ open, onOpenChange, document }: Props) {
  const list = useServerFn(listDocumentPermissions);
  const grant = useServerFn(grantDocumentPermission);
  const revoke = useServerFn(revokeDocumentPermission);

  const [perms, setPerms] = useState<DocumentPermissionRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<Level>("view_document");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const r = await list({ data: { document_id: document.id } });
      setPerms(r.permissions);
    } catch (err) {
      console.error(err);
      setPerms([]);
    }
  }

  useEffect(() => {
    if (open) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, document.id]);

  async function handleGrant() {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await grant({
        data: { document_id: document.id, user_email: e, permission_level: level },
      });
      toast.success(`Access granted to ${e}.`);
      setEmail("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grant access.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this person's access to this document?")) return;
    try {
      await revoke({ data: { id } });
      toast.success("Access revoked.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke access.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage access · {document.title}</DialogTitle>
          <DialogDescription>
            Anyone on this student's team already has access. Use this to grant additional
            people access by email. Every grant and revoke is recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
            <div>
              <Label htmlFor="perm-email" className="mb-1 inline-block text-xs">
                Person's email
              </Label>
              <Input
                id="perm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="them@example.com"
                maxLength={254}
              />
            </div>
            <div>
              <Label htmlFor="perm-level" className="mb-1 inline-block text-xs">
                Access level
              </Label>
              <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                <SelectTrigger id="perm-level" className="min-w-[12rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LEVEL_LABEL) as Level[])
                    .filter((l) => l !== "none")
                    .map((l) => (
                      <SelectItem key={l} value={l}>
                        {LEVEL_LABEL[l]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={handleGrant} disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Granting…
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" /> Grant access
              </>
            )}
          </Button>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            The person must already have a TransitionForward account. Partners can never be
            granted access to IEPs.
          </p>
        </div>

        <div className="mt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current grants
          </p>
          {perms === null ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : perms.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No extra grants yet — only the student's team can see this file.
            </p>
          ) : (
            <ul className="mt-2 divide-y rounded-xl border">
              {perms.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.user_id ? `User · ${p.user_id.slice(0, 8)}…` : `Role · ${p.role_type}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{LEVEL_LABEL[p.permission_level]}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(p.id)}
                    aria-label="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
