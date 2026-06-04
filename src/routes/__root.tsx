import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityControls } from "@/components/a11y/AccessibilityControls";
import { SmoothScroll } from "@/components/effects/SmoothScroll";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TransitionForward" },
      { name: "description", content: "Student-centered transition planning for Connecticut families, students, and educators." },
      { property: "og:title", content: "TransitionForward" },
      { property: "og:description", content: "Student-centered transition planning for Connecticut families, students, and educators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "TransitionForward",
              description: "Student-centered transition planning for Connecticut families, students, and educators.",
              url: "/",
              areaServed: "Connecticut, USA",
              knowsAbout: ["Special Education", "Transition Planning", "IEP", "Postsecondary Planning", "Connecticut Special Education"],
            },
            {
              "@type": "WebSite",
              name: "TransitionForward",
              description: "Student-centered transition planning for Connecticut families, students, and educators.",
              url: "/",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Generate a per-request CSP nonce during SSR so the inline dark-mode
  // restore script can be allow-listed by a strict Content-Security-Policy
  // (e.g. `script-src 'self' 'nonce-...'`). The shell only renders on the
  // server, so there's no hydration mismatch. The nonce is also exposed via
  // a <meta name="csp-nonce"> tag so other code or CSP middleware can read
  // the same value when assembling the response header.
  const nonce =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  return (
    <html lang="en">
      <head>
        <meta name="csp-nonce" content={nonce} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var darkKey = "a11y:dark-mode";
                  var raw = localStorage.getItem(darkKey);
                  var dark = raw === null ? matchMedia("(prefers-color-scheme: dark)").matches : raw === "1";
                  if (dark) document.documentElement.classList.add("dark");
                  var locKey = "i18n:locale";
                  var loc = localStorage.getItem(locKey);
                  if (loc && /^[a-z]{2,3}$/.test(loc)) {
                    document.documentElement.lang = loc;
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SmoothScroll />
        <ScrollToTop />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster />
        <AccessibilityControls />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

