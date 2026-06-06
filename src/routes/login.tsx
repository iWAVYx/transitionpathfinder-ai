import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

const SignInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const SignUpSchema = SignInSchema.extend({
  full_name: z.string().trim().min(1, "Required").max(200),
});

export const Route = createFileRoute("/login")({
  validateSearch: (s: { redirect?: string }): { redirect: string } => ({
    redirect: s.redirect || "/dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TransitionForward" },
      { name: "description", content: "Sign in or create your TransitionForward parent account." },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Post-auth gate. Runs for both password sign-in (where the form already
  // checks AAL) and OAuth returnees (Google), since the OAuth callback drops
  // the user back here with a freshly persisted session. If the account has
  // a verified TOTP factor but the session is still aal1, bounce to the 2FA
  // challenge before letting them through to their redirect target.
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        navigate({
          to: "/login/2fa",
          search: { redirect: search.redirect },
          replace: true,
        });
        return;
      }
      navigate({ to: search.redirect, replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, search.redirect, navigate]);


  return (
    <SiteShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-5">
          <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft md:col-span-2 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Welcome back
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground">
              Good to See You Again.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Sign in to pick up wherever you left off — your child's plan, the
              next gentle step, and the small things you've been meaning to ask.
            </p>
            <ul className="mt-7 space-y-2 text-sm leading-relaxed text-foreground/80">
              <li>· Your child's records, kept private and encrypted</li>
              <li>· A grade-by-grade picture of where they are</li>
              <li>· Suggestions grounded in research, never guesses</li>
            </ul>
          </div>


          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft md:col-span-3 md:p-8">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignUpForm />
              </TabsContent>
            </Tabs>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <GoogleButton />

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <a href="/privacy" className="underline">privacy notice</a>.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function SignInForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const navigate = useNavigate();
  const search = Route.useSearch();
  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    // After password sign-in, see whether this account needs to escalate to
    // aal2 (a verified TOTP factor exists). If so, route to /login/2fa and
    // preserve the original redirect target.
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setSubmitting(false);
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      navigate({
        to: "/login/2fa",
        search: { redirect: search.redirect },
        replace: true,
      });
      return;
    }
    toast.success("Signed in");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: "", password: "", full_name: "" },
  });

  const onSubmit = async (values: z.infer<typeof SignUpSchema>) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: values.full_name },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email to confirm your account.");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" {...form.register("full_name")} />
        {form.formState.errors.full_name && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.full_name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
  };
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={loading} className="w-full">
      {loading ? "Opening Google…" : "Continue with Google"}
    </Button>
  );
}
