import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Users,
  HeartHandshake,
  Link2,
  Eye,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  getStudentAccessOverview,
  type AccessOverview,
} from "@/lib/sharing.functions";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function WhoCanSeeThisPanel({ studentId }: { studentId: string }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-muted-foreground">Loading access…</p>;
  if (!user) return <p className="text-sm text-muted-foreground">Sign in to view access information.</p>;
  return <AccessOverviewReader key={`${user.id}:${studentId}`} studentId={studentId} viewerId={user.id} />;
}

function AccessOverviewReader({ studentId, viewerId }: { studentId: string; viewerId: string }) {
  const fetchOverview = useServerFn(getStudentAccessOverview);
  const [data, setData] = useState<AccessOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setFailed(false);
    fetchOverview({ data: { student_id: studentId, expected_viewer_id: viewerId } })
      .then((r) => {
        if (active) setData(r);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId, viewerId, fetchOverview, attempt]);

  const total =
    (data?.collaborators.length ?? 0) +
    (data?.relationships.length ?? 0) +
    (data?.share_links.length ?? 0);

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Who Can See This?</h2>
            <p className="text-sm text-muted-foreground">
              Access records you can view for this student: accepted collaborators,
              approved family or team connections, and active report links.
              Other permissions may be managed separately.
            </p>
          </div>
        </div>
        {!loading && !failed && (
          <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        )}
      </header>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading access…</p>
      ) : failed ? (
        <div className="mt-4" role="alert">
          <p className="text-sm">We couldn't load access information. Please try again.</p>
          <Button className="mt-2" variant="outline" size="sm" onClick={() => setAttempt(value => value + 1)}>Try Again</Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <AccessGroup
            icon={<Users className="h-4 w-4" />}
            title="Collaborators"
            empty="No invited collaborators."
            items={(data?.collaborators ?? []).map((c) => ({
              key: c.id,
              primary: c.name ?? c.email,
              secondary: `${c.role} · added ${fmtDate(c.added_at) ?? "recently"}`,
            }))}
          />
          <AccessGroup
            icon={<HeartHandshake className="h-4 w-4" />}
            title="Family & Team"
            empty="No approved family or case-manager connections."
            items={(data?.relationships ?? []).map((r) => ({
              key: r.id,
              primary: r.name ?? r.email ?? r.relationship_type,
              secondary: `${r.relationship_type} · ${r.permission_level}`,
            }))}
          />
          <AccessGroup
            icon={<Link2 className="h-4 w-4" />}
            title="Active Share Links"
            empty="No active share links."
            items={(data?.share_links ?? []).map((s) => {
              const exp = fmtDate(s.expires_at);
              return {
                key: s.id,
                primary: `${s.audience} link · ${s.view_count} ${s.view_count === 1 ? "view" : "views"}`,
                secondary: exp ? `expires ${exp}` : "no expiration",
                trailing: (
                  <Link
                    to="/reports/$reportId"
                    params={{ reportId: s.report_id }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Report <ExternalLink className="h-3 w-3" />
                  </Link>
                ),
              };
            })}
          />
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="h-3 w-3" />
        Manage individual access in the Collaborators, Family Team, and Share
        Links sections below or on each report page.
      </p>
    </section>
  );
}

function AccessGroup({
  icon,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  items: Array<{
    key: string;
    primary: string;
    secondary?: string;
    trailing?: React.ReactNode;
  }>;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-start justify-between gap-2 rounded-lg bg-background px-2.5 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{it.primary}</p>
                {it.secondary && (
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {it.secondary}
                  </p>
                )}
              </div>
              {it.trailing}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
