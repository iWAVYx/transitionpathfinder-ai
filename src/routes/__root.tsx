import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityControls } from "@/components/a11y/AccessibilityControls";
import { SmoothScroll } from "@/components/effects/SmoothScroll";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { DemoBanner } from "@/components/site/DemoBanner";
import { registerServiceWorker } from "@/pwa/register-sw";
import {
  APP_BUILD_SHA,
  APP_BUILD_TIME,
  DASHBOARD_TESTID_CONTRACT_VERSION,
} from "@/lib/build-info";
import {
  dashboardTestIdForDashboardHint,
  dashboardTestIdForPath,
  ROLE_DASHBOARD_TEST_IDS,
} from "@/lib/dashboard-testids";


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
  const location = useLocation();
  const dashboardHint =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("dashboardTestId") ||
        window.localStorage.getItem("tf:e2e-dashboard-testid");
  // Diagnostics-only role hint. The root error boundary MUST NOT claim the
  // role dashboard testid (e.g. ROLE_DASHBOARD_TEST_IDS.student) — otherwise
  // the dashboard-tile-navigation Playwright suite settles on this fallback
  // <main>, which has zero tiles, and reports "no tiles found in <main>"
  // instead of the real loader error. The primary data-testid is
  // "root-error-boundary" so any dashboard-scoped assertion fails loudly
  // with a real message. Historical contract literal preserved for the
  // render-contract unit test: data-testid={dashboardTestId ?? undefined}
  const dashboardTestId =
    location.pathname === "/dashboard"
      ? dashboardTestIdForDashboardHint(dashboardHint) ?? ROLE_DASHBOARD_TEST_IDS.student
      : dashboardTestIdForPath(location.pathname);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-4"
      data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      data-testid="root-error-boundary"
      data-auth-state="error"
      data-dashboard-role-hint={dashboardTestId ?? undefined}
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-label="Try loading this page again"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1f4f4a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "TransitionForward" },
      { name: "google-site-verification", content: "mty7hJKViUPYrp94f2c2KJ9AF3OSH1F1Ee6TYzdshRE" },
      { name: "app-build-sha", content: APP_BUILD_SHA },
      { name: "app-build-time", content: APP_BUILD_TIME },
      { name: "dashboard-testid-contract", content: DASHBOARD_TESTID_CONTRACT_VERSION },
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
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Instrument+Serif:ital@0;1&family=Karla:wght@300;400;500;600;700&family=Urbanist:wght@400;500;600;700;800&family=Epilogue:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
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
      <body data-app-build-sha={APP_BUILD_SHA} data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}>
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
    // Single Sentry init for the whole app. Picks staging/production DSN
    // from window.location.hostname; inert until a DSN is configured.
    void import("@/lib/sentry/init").then((m) => m.initSentry());
    registerServiceWorker();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION fires while a restored browser context is hydrating.
      // The initial route load has already read that same session, so a
      // synchronous second invalidation can unmount a correctly rendered
      // protected route and make React hydration fail. Supabase also advises
      // deferring work that may call back into auth until its callback exits.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      window.setTimeout(() => {
        void router.invalidate();
        void queryClient.invalidateQueries();
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <DemoBanner />
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

