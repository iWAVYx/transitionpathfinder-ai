import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TransitionForward" },
      { name: "description", content: "Sign in or create your TransitionForward parent account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: search.redirect, replace: true });
    }
  }, [user, loading, search.redirect, navigate]);

  return (
    <SiteShell>
      <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-5">
          <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft md:col-span-2 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              TransitionForward
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              Welcome back.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Parents and educators sign in to manage student transition plans, upload IEPs,
              and follow the grade-band roadmap toward post-school success.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-foreground/80">
              <li>• Secure, encrypted IEP storage</li>
              <li>• Grade-banded readiness snapshots</li>
              <li>• AI-grounded suggestions, not guesswork</li>
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

  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
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

// Loader guard to send already-signed-in users away from /login is handled
// in the component via useAuth (since SSR has no session here).
// Provide a redirect helper for direct visits when auth context exists later.
export function _routeRedirectHelper() {
  return redirect({ to: "/dashboard" });
}
