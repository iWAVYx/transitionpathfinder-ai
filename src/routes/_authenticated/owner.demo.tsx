import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCw, Trash2, Loader2, Copy, ExternalLink, Check } from "lucide-react";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listDemoAccounts,
  seedDemoData,
  resetDemoData,
  DEMO_ACCOUNTS,
  type DemoAccount,
} from "@/lib/owner/demo-seed.functions";

export const Route = createFileRoute("/_authenticated/owner/demo")({
  head: () => ({ meta: [{ title: "Demo Mode — Admin Hub" }] }),
  component: OwnerDemoPage,
});

type SeededAccount = {
  role: string;
  label: string;
  email: string;
  password: string;
  user_id: string;
};

function OwnerDemoPage() {
  const list = useServerFn(listDemoAccounts);
  const seed = useServerFn(seedDemoData);
  const reset = useServerFn(resetDemoData);

  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [seeded, setSeeded] = useState<SeededAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const r = await list();
      setAccounts(r.accounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSeed() {
    setError(null);
    setSeeding(true);
    try {
      const r = await seed();
      setSeeded(r.accounts);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  }

  async function handleReset() {
    if (!confirm("Delete all demo accounts and their data? This cannot be undone.")) return;
    setError(null);
    setResetting(true);
    try {
      await reset();
      setSeeded(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetting(false);
    }
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const anySeeded = accounts.some((a) => a.user_id);

  return (
    <OwnerShell
      title="Demo Mode"
      description="One-click seed for demo accounts and a shared demo student. Demo data is tagged is_demo=true and is visually flagged everywhere."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSeed} disabled={seeding || resetting}>
            {seeding ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {anySeeded ? "Re-seed demo data" : "Seed demo data"}
          </Button>
          <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" variant="destructive" onClick={handleReset} disabled={resetting || !anySeeded}>
            {resetting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
            Delete demo data
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-background p-4">
          <h2 className="text-sm font-semibold">What this seeds</h2>
          <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground space-y-1">
            <li>6 demo accounts (Parent, Educator/CM, School Admin, District Admin, Partner, Platform Admin)</li>
            <li>One shared demo student ("Jordan Rivera"), owned by the parent, editor-shared with the educator</li>
            <li>3 goals, 4 action items, 3 calendar events tied to the demo student</li>
            <li>Every row is tagged <code>is_demo = true</code></li>
          </ul>
        </section>

        {seeded && (
          <section className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Credentials (copy now — passwords are not shown again)
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {seeded.map((a) => (
                <div key={a.email} className="rounded border border-border bg-background p-2 text-xs">
                  <div className="font-medium">{a.label}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate">{a.email}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyText(a.email, a.email)}>
                      {copied === a.email ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate">{a.password}</code>
                    <Button size="sm" variant="ghost" onClick={() => copyText(a.password, a.password)}>
                      {copied === a.password ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demo accounts
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((a) => {
                  const exists = !!a.user_id;
                  return (
                    <tr key={a.email}>
                      <td className="px-3 py-2">{a.label}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.email}</td>
                      <td className="px-3 py-2">
                        {exists ? (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700">
                            Seeded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                            Not seeded
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && accounts.length === 0 &&
                  DEMO_ACCOUNTS.map((a) => (
                    <tr key={a.email}>
                      <td className="px-3 py-2">{a.label}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.email}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">Unknown</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Sign in at <code>/auth</code> using any seeded credentials to walk through that role's experience.
          </p>
        </section>
      </div>
    </OwnerShell>
  );
}
