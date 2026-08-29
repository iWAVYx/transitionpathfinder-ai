// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { resolveBuildSha } from "./scripts/resolve-build-sha.mjs";

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

function splitLovableBuildEnvironments(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const requestedModeIndex = process.argv.indexOf("--mode");
  const requestedMode = requestedModeIndex >= 0 ? process.argv[requestedModeIndex + 1] : "production";
  if (!requestedMode || requestedMode.startsWith("--")) {
    throw new Error("--mode requires a value");
  }
  const environmentBuilder = fileURLToPath(
    new URL("./scripts/build-environment.mjs", import.meta.url),
  );

  function buildInChildProcess(environmentName: "client" | "ssr") {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [environmentBuilder, environmentName, requestedMode], {
        env: {
          ...process.env,
          VITE_APP_BUILD_TIME: appBuildTime,
        },
        stdio: "inherit",
      });

      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `${environmentName} build failed${
              signal ? ` with signal ${signal}` : ` with exit code ${String(code)}`
            }`,
          ),
        );
      });
    });
  }

  return {
    name: "transitionforward:split-lovable-build-environments",
    apply: "build",
    buildApp: {
      order: "pre",
      async handler(builder) {
        if (!isLovableSandbox) return;

        const client = builder.environments.client;
        const ssr = builder.environments.ssr;
        if (!client || !ssr) {
          throw new Error("Lovable builds require both client and SSR environments");
        }

        await buildInChildProcess("client");
        client.isBuilt = true;
        await buildInChildProcess("ssr");
        ssr.isBuilt = true;
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

// Lovable's hosted builder does not currently expose a documented commit-SHA
// variable. Prefer explicit platform metadata, then derive the exact SHA from
// the checked-out repository. If neither is available, retain the fail-closed
// "dev" identity so production health cannot report a false positive.
const appBuildSha = resolveBuildSha();

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
    // Keep Lovable's supported Vite application-build entrypoint, but release
    // the client and SSR graphs in child processes before Nitro creates the
    // single fetch bundle. Workbox runs afterward from the package script.
    plugins: [
      splitLovableBuildEnvironments(),
      serverAuthenticatedRouteStubs(),
      buildEnvironmentGarbageCollector(),
    ],
  },
});
