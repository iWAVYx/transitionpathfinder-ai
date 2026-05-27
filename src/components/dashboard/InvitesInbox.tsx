import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mailbox, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listMyInvites, acceptInvite, type InviteWithStudent } from "@/lib/collaborators.functions";

export function InvitesInbox() {
  const fetchInvites = useServerFn(listMyInvites);
  const accept = useServerFn(acceptInvite);
  const [invites, setInvites] = useState<InviteWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    try {
      const { invites } = await fetchInvites();
      setInvites(invites);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await accept({ data: { id } });
      toast.success("Invite accepted.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept invite.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || invites.length === 0) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <Mailbox className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl">Pending invites</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {invites.map((i) => {
          const name = [i.student_first_name, i.student_last_name].filter(Boolean).join(" ") || "a student";
          return (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
              <div className="min-w-0">
                <p className="text-sm">
                  {i.inviter_name ? <strong>{i.inviter_name}</strong> : "Someone"} invited you as <strong>{i.role}</strong> for <strong>{name}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(i.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAccept(i.id)} disabled={busyId === i.id}>
                  {busyId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Accept
                </Button>
                {i.student_id && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/students/$studentId" params={{ studentId: i.student_id }}>
                      Preview
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
