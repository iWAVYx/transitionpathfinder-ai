import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { listTestingScripts } from "@/lib/validation/validation.functions";

export const Route = createFileRoute("/_authenticated/owner/testing-scripts")({
  head: () => ({ meta: [{ title: "Testing Scripts — Admin Hub" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listTestingScripts);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list()
      .then((r) => setRows(r.rows))
      .finally(() => setLoading(false));
  }, []);

  return (
    <OwnerShell
      title="Role-Based Testing Scripts"
      description="Hand these checklists to beta testers. Track pass/fail per step in Testing Runs."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((s) => (
            <section key={s.id} className="rounded-lg border border-border bg-background p-4">
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{s.title}</h2>
                <Badge variant="outline">{s.role_type}</Badge>
              </header>
              {s.description && (
                <p className="mb-3 text-xs text-muted-foreground">{s.description}</p>
              )}
              <ol className="space-y-1 text-sm">
                {(s.checklist as { key: string; label: string }[]).map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground">
                script key: <code>{s.script_key}</code>
              </p>
            </section>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
