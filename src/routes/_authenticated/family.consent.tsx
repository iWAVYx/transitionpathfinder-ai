import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Loader2, X } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
import { BackToDashboard } from "@/components/dashboard/BackToDashboard";
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  listSharingPermissions,
  revokeSharingPermission,
  type SharingPermission,
} from "@/lib/family.functions";

export const Route = createFileRoute("/_authenticated/family/consent")({
  head: () => ({
    meta: [
      { title: "Sharing & Consent — TransitionForward" },
      {
        name: "description",
        content:
          "Control who sees your student's plan, documents, and reports. Revoke access at any time.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/family/consent">
      <FamilyConsentPage />
    </RoleGuard>
  ),
});

function FamilyConsentPage() {
  const loadStudents = useServerFn(listStudents);
  const loadPerms = useServerFn(listSharingPermissions);
  const revoke = useServerFn(revokeSharingPermission);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [perms, setPerms] = useState<SharingPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadStudents()
      .then(({ students }) => {
        setStudents(students);
        if (students[0]) setStudentId(students[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadPerms({ data: { student_id: studentId } })
      .then(({ permissions }) => setPerms(permissions))
      .catch(() => toast.error("Could not load sharing settings"))
      .finally(() => setLoading(false));
  }, [studentId, loadPerms]);

  async function handleRevoke(p: SharingPermission) {
    setRevokingId(p.id);
    try {
      await revoke({ data: { id: p.id } });
      setPerms((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Access revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <SiteShell>
      <main
        data-testid="family-consent-page"
        className="mx-auto max-w-4xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Sharing & Consent" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Sharing & Consent
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            You decide who can see your student's plan, reports, and documents.
            Revoke access anytime.
          </p>
        </header>

        {students.length > 1 ? (
          <div className="mb-6 max-w-sm">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No student connected yet"
            body="Once a student is linked to your account, sharing controls show here."
            cta={{ label: "Go to dashboard", to: "/dashboard" }}
          />
        ) : perms.length === 0 ? (
          <EmptyState
            title="No one else has access"
            body="You haven't shared this student's plan with anyone yet. When you invite an educator or partner, they'll appear here."
            cta={{ label: "Manage students", to: "/students" }}
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {perms.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {p.shared_with_user_id
                      ? "Individual user"
                      : "Organization"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Granted {new Date(p.created_at).toLocaleDateString()}
                    {p.expiration_date && (
                      <>
                        {" · "}Expires{" "}
                        {new Date(p.expiration_date).toLocaleDateString()}
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{p.access_level}</Badge>
                    {Array.isArray(p.shared_items) &&
                      p.shared_items.slice(0, 4).map((item, i) => (
                        <Badge key={i} variant="outline">
                          {String(item)}
                        </Badge>
                      ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokingId === p.id}
                  onClick={() => handleRevoke(p)}
                >
                  {revokingId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="mr-1 h-4 w-4" /> Revoke
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          <BackToDashboard />
        </div>
      </main>
    </SiteShell>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: string };
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
