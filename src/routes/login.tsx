import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Sparkles, ShieldCheck, HeartHandshake, Compass } from "lucide-react";

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


  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const isNew = tab === "signup";

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-50" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl"
        />

        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid w-full max-w-5xl gap-6 md:grid-cols-5">
            <aside className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 p-8 shadow-soft backdrop-blur-sm md:col-span-2 md:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {isNew ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Welcome in
                  </>
                ) : (
                  <>
                    <HeartHandshake className="h-3.5 w-3.5" /> Welcome back
                  </>
                )}
              </span>

              <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground">
                {isNew
                  ? "Let's begin — together."
                  : "Good to see you again."}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {isNew
                  ? "Set up your account in under a minute. We'll save your place and you can come back whenever the day gives you a quiet moment."
                  : "Sign in to pick up where you left off — your child's plan, the next gentle step, and the small things you've been meaning to ask."}
              </p>

              <ul className="mt-8 space-y-3 text-sm leading-relaxed text-foreground/85">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span>Private and encrypted — your child's records stay yours.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Compass className="h-4 w-4" />
                  </span>
                  <span>A grade-by-grade picture of where they are right now.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HeartHandshake className="h-4 w-4" />
                  </span>
                  <span>Suggestions grounded in research — never guesses.</span>
                </li>
              </ul>

              <figure className="mt-8 rounded-2xl border border-border/50 bg-background/60 p-4">
                <blockquote className="font-display text-sm italic leading-relaxed text-foreground/85">
                  "It finally felt like someone was walking with us instead of handing us another binder."
                </blockquote>
                <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  — A Connecticut parent, pilot cohort
                </figcaption>
              </figure>
            </aside>

            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-lift md:col-span-3 md:p-8">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <p className="mb-5 text-sm text-muted-foreground">
                    Enter your email and password to continue.
                  </p>
                  <SignInForm />
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    <a href="/reset-password" className="font-medium text-primary underline-offset-4 hover:underline">
                      Forgot your password?
                    </a>
                  </p>
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <p className="mb-5 text-sm text-muted-foreground">
                    No pressure, no spam. Just a quiet place to plan.
                  </p>
                  <SignUpForm />
                </TabsContent>
              </Tabs>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <GoogleButton />

              <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
                By continuing you agree to our{" "}
                <a href="/privacy" className="underline underline-offset-2">privacy notice</a>
                {" "}and{" "}
                <a href="/terms" className="underline underline-offset-2">terms</a>.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            New here?{" "}
            <a href="/waitlist" className="font-semibold text-primary underline-offset-4 hover:underline">
              Join the pilot waitlist →
            </a>
          </p>
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
  const search = Route.useSearch();
  const onClick = async () => {
    setLoading(true);
    // Return to /login (not /dashboard) so LoginPage's post-auth effect runs
    // the AAL check before the user is forwarded anywhere protected. The
    // `_authenticated` gate also enforces aal2, but routing through /login
    // gives us a single, testable choke point for both password and OAuth.
    const returnTo = new URL("/login", window.location.origin);
    returnTo.searchParams.set("redirect", search.redirect);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: returnTo.toString(),
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
