// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const appBuildSha =
  process.env.VITE_APP_BUILD_SHA ??
  process.env.GITHUB_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  "dev";

const appBuildTime = process.env.VITE_APP_BUILD_TIME ?? new Date().toISOString();
const appEnv = process.env.APP_ENV ?? "";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      // Hosted preview builds emit hundreds of chunks. Gzipping each one only
      // to print size statistics adds memory pressure without changing output.
      reportCompressedSize: false,
    },
    define: {
      "import.meta.env.APP_ENV": JSON.stringify(appEnv),
      "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(appBuildSha),
      "import.meta.env.VITE_APP_BUILD_TIME": JSON.stringify(appBuildTime),
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        // Nitro/Cloudflare publishes .output/public. Without this override the
        // plugin writes dist/sw.js, which is never included in the deployment.
        outDir: ".output/public",
        filename: "sw.js",
        manifest: false, // we ship a hand-authored manifest at public/manifest.webmanifest
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Remove the legacy HTML runtime cache. Authenticated SSR responses
          // must never survive sign-out or become visible on a shared device.
          importScripts: ["/sw-privacy-cleanup.js"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Always fetch SSR navigations from the network. If the device is
              // actually offline, serve only the generic precached offline page.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkOnly",
              options: { precacheFallback: { fallbackURL: "/offline.html" } },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["style", "script", "worker"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "tf-assets" },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "tf-media",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "tf-gfonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
