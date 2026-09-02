import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  APP_BUILD_SHA,
  APP_BUILD_TIME,
  DASHBOARD_TESTID_CONTRACT_VERSION,
} from "@/lib/build-info";
import { resolveCspNonce } from "@/lib/cspNonce";
import appCss from "@/styles.css?url";

// This module replaces __root.tsx only in the server half of an explicitly
// browser-rendered Lovable preview build. The client still receives the real
// root route, providers, accessibility controls, and complete product UI.
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1f4f4a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "TransitionForward" },
      {
        name: "google-site-verification",
        content: "mty7hJKViUPYrp94f2c2KJ9AF3OSH1F1Ee6TYzdshRE",
      },
      { name: "app-build-sha", content: APP_BUILD_SHA },
      { name: "app-build-time", content: APP_BUILD_TIME },
      { name: "dashboard-testid-contract", content: DASHBOARD_TESTID_CONTRACT_VERSION },
      { title: "TransitionForward" },
      {
        name: "description",
        content:
          "Student-centered transition planning for Connecticut families, students, and educators.",
      },
      { property: "og:title", content: "TransitionForward" },
      {
        property: "og:description",
        content:
          "Student-centered transition planning for Connecticut families, students, and educators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "TransitionForward" },
      {
        name: "twitter:description",
        content:
          "Student-centered transition planning for Connecticut families, students, and educators.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66c26351-1645-4962-8766-8719416f28ba/id-preview-2f432d2f--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app-1780535419668.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/66c26351-1645-4962-8766-8719416f28ba/id-preview-2f432d2f--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app-1780535419668.png",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Urbanist:wght@400;500;600;700;800&family=Epilogue:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@300;400;500;600;700&family=Lora:ital,wght@400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&family=Caveat:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
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
              description:
                "Student-centered transition planning for Connecticut families, students, and educators.",
              url: "/",
              areaServed: "Connecticut, USA",
              knowsAbout: [
                "Special Education",
                "Transition Planning",
                "IEP",
                "Postsecondary Planning",
                "Connecticut Special Education",
              ],
            },
            {
              "@type": "WebSite",
              name: "TransitionForward",
              description:
                "Student-centered transition planning for Connecticut families, students, and educators.",
              url: "/",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: LovablePreviewRootShell,
  component: () => null,
});

function LovablePreviewRootShell({ children }: { children: ReactNode }) {
  const nonce = resolveCspNonce();

  return (
    <html lang="en">
      <head>
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
      <body
        data-app-build-sha={APP_BUILD_SHA}
        data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}
