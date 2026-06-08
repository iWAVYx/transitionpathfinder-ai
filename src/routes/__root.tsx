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
      { name: "google-site-verification", content: "mty7hJKViUPYrp94f2c2KJ9AF3OSH1F1Ee6TYzdshRE" },
      { title: "TransitionForward" },
      { name: "description", content: "Student-centered transition planning for Connecticut families, students, and educators." },
      { property: "og:title", content: "TransitionForward" },
      { property: "og:description", content: "Student-centered transition planning for Connecticut families, students, and educators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "TransitionForward" },
      { name: "twitter:description", content: "Student-centered transition planning for Connecticut families, students, and educators." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66c26351-1645-4962-8766-8719416f28ba/id-preview-2f432d2f--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app-1780535419668.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66c26351-1645-4962-8766-8719416f28ba/id-preview-2f432d2f--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app-1780535419668.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Karla:wght@300;400;500;600;700&display=swap",
      },
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
        {/* Force light as the default color scheme everywhere — the app opts
            into dark only when the user explicitly toggles it via the
            accessibility panel (localStorage["a11y:dark-mode"] === "1"). */}
        <meta name="color-scheme" content="light" />
        <meta name="csp-nonce" content={nonce} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var darkKey = "a11y:dark-mode";
                  var raw = localStorage.getItem(darkKey);
                  if (raw === "1") document.documentElement.classList.add("dark");
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
    void import("@/lib/dev/hmr-diagnostics").then((m) => m.installHmrDiagnostics());
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

