import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, MailX } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "loading" }
  | { kind: "ready"; email: string }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({ meta: [{ title: "Unsubscribe — Transition Pathways Hub" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "Missing unsubscribe token." });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({
            kind: "invalid",
            message: body?.error ?? "Invalid or expired link.",
          });
          return;
        }
        if (body?.already_unsubscribed) {
          setState({ kind: "already" });
          return;
        }
        setState({ kind: "ready", email: body?.email ?? "your email" });
      })
      .catch(() =>
        setState({ kind: "invalid", message: "Could not validate this link." }),
      );
  }, [token]);

  const confirm = async () => {
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: body?.error ?? "Could not unsubscribe. Please try again.",
        });
        return;
      }
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <MailX className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Email preferences
            </span>
          </div>

          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </div>
          )}

          {state.kind === "ready" && (
            <>
              <h1 className="text-2xl font-semibold">Unsubscribe</h1>
              <p className="mt-3 text-muted-foreground">
                Click the button below to stop receiving emails at{" "}
                <strong className="text-foreground">{state.email}</strong>.
              </p>
              <Button className="mt-6" onClick={confirm}>
                Confirm unsubscribe
              </Button>
            </>
          )}

          {state.kind === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating preferences…
            </div>
          )}

          {state.kind === "done" && (
            <>
              <div className="mb-3 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <h1 className="text-2xl font-semibold">You're unsubscribed</h1>
              </div>
              <p className="text-muted-foreground">
                You won't receive any more emails from us at this address.
              </p>
            </>
          )}

          {state.kind === "already" && (
            <>
              <div className="mb-3 flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <h1 className="text-2xl font-semibold">Already unsubscribed</h1>
              </div>
              <p className="text-muted-foreground">
                This email has already been removed from our list.
              </p>
            </>
          )}

          {(state.kind === "invalid" || state.kind === "error") && (
            <>
              <div className="mb-3 flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <h1 className="text-2xl font-semibold">Something went wrong</h1>
              </div>
              <p className="text-muted-foreground">{state.message}</p>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
