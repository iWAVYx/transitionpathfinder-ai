import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — TransitionForward" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use something memorable — and not one you've used on another site.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving…" : "Update password"}
          </Button>
        </form>
      </section>
    </SiteShell>
  );
}
