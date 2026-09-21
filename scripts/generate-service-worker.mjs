import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRequire = createRequire(import.meta.url);
const vitePwaRequire = createRequire(projectRequire.resolve("vite-plugin-pwa/package.json"));
const { generateSW } = vitePwaRequire("workbox-build");

const isLovableBuild =
  process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
const defaultPublicDirectory = fileURLToPath(
  new URL(isLovableBuild ? "../dist/client" : "../.output/public", import.meta.url),
);
// The hosted build appends Vite flags like `--config <file>`; only a bare
// positional argument overrides the public directory. Ignore flag/value pairs.
const positionalArgs = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith("--")) {
    i++; // skip the flag's value
    continue;
  }
  positionalArgs.push(process.argv[i]);
}
const publicDirectory = resolve(positionalArgs[0] ?? defaultPublicDirectory);

if (!existsSync(publicDirectory)) {
  throw new Error(
    "Cannot generate the service worker: deployed asset directory does not exist: " +
      publicDirectory,
  );
}

await generateSW({
  globDirectory: publicDirectory,
  swDest: join(publicDirectory, "sw.js"),
  globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  importScripts: ["/sw-privacy-cleanup.js"],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
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
        url.origin === self.location.origin && ["image", "font"].includes(request.destination),
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
});
