// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function buildEnvironmentGarbageCollector(): Plugin {
  return {
    name: "transitionforward:build-environment-garbage-collector",
    apply: "build",
    // TanStack Start builds the client, SSR, and Nitro environments in one
    // process. Reclaim an environment's unreachable heap before the next one
    // starts so Lovable's hosted preview does not retain every build graph.
    closeBundle: {
      order: "post",
      handler() {
        global.gc?.();
      },
    },
  };
}

function serverAuthenticatedRouteStubs(): Plugin {
  return {
    name: "transitionforward:server-authenticated-route-stubs",
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name !== "client",
    transform(source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      const isAuthenticatedRoute =
        normalizedId.endsWith("/src/routes/_authenticated.tsx") ||
        (normalizedId.includes("/src/routes/_authenticated/") && normalizedId.endsWith(".tsx"));
      if (!isAuthenticatedRoute) return null;

      // The parent route already declares ssr:false because authentication is
      // restored from browser storage. These modules therefore cannot render
      // on the server, but Nitro would otherwise parse and inline all 138 UI
      // routes into Lovable's single-file fetch bundle. Refuse to stub a route
      // if a future change adds an inline server primitive; those handlers must
      // first be moved to a dedicated *.functions.ts or server route module.
      if (/\bcreate(?:ServerFn|ServerOnlyFn|Middleware|ServerFileRoute)\b/.test(source)) {
        throw new Error(
          `[server-authenticated-route-stubs] ${normalizedId} contains an inline server primitive`,
        );
      }

      const routeMatch = source.match(/\bcreateFileRoute\(\s*(["'`])([^"'`]+)\1\s*\)/);
      if (!routeMatch) {
        throw new Error(
          `[server-authenticated-route-stubs] Could not identify the route path in ${normalizedId}`,
        );
      }

      return {
        code: `import { createFileRoute } from "@tanstack/react-router";\nexport const Route = createFileRoute(${JSON.stringify(routeMatch[2])})({ ssr: false });\n`,
        map: null,
      };
    },
  };
}

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
      sourcemap: false,
      // Hosted preview builds emit hundreds of chunks. Gzipping each one only
      // to print size statistics adds memory pressure without changing output.
      reportCompressedSize: false,
      rollupOptions: {
        // Rollup otherwise permits up to 1,000 queued file operations. Keep
        // enough parallelism for a useful build while leaving memory headroom
        // inside Lovable's smaller hosted build containers.
        maxParallelFileOps: 2,
      },
    },
    define: {
      "import.meta.env.APP_ENV": JSON.stringify(appEnv),
      "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(appBuildSha),
      "import.meta.env.VITE_APP_BUILD_TIME": JSON.stringify(appBuildTime),
    },
    // The hosted build orchestrator runs the memory-heavy client bundle in a
    // fresh Node process, then completes SSR and Nitro in the parent builder.
    // Workbox runs afterward from scripts/generate-service-worker.mjs.
    plugins: [serverAuthenticatedRouteStubs(), buildEnvironmentGarbageCollector()],
  },
});
