// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnv, type Plugin } from "vite";
import {
  collectLucideRuntimeExports,
  createLucideIconBundle,
  mapLucideIconModules,
  rewriteLucideReactImportsFromBundle,
} from "./scripts/direct-lucide-icon-imports.mjs";
import { mapDateFnsModules, rewriteDateFnsImports } from "./scripts/direct-date-fns-imports.mjs";
import { rewriteMotionReactImports } from "./scripts/direct-motion-imports.mjs";
import { resolveBuildSha } from "./scripts/resolve-build-sha.mjs";

const CHILD_BUILD_MODE_ENV = "TRANSITIONFORWARD_VITE_MODE";
const CHILD_BUILD_ENVIRONMENT_ENV = "TRANSITIONFORWARD_VITE_ENVIRONMENT";
// Node 22 on GitHub's Linux runner reaches roughly 921 MiB while rendering the
// complete 1,339-module client graph. Give the short-lived client/SSR children
// portable headroom while the now-small Nitro parent remains capped at 768 MiB.
const LOVABLE_CHILD_NODE_OPTIONS = "--max-semi-space-size=4 --max-old-space-size=1024";
const JSPDF_OPTIONAL_RENDERER_STUB_PREFIX = "\0transitionforward:jspdf-optional-renderer:";
const LUCIDE_BUNDLE_ID = "transitionforward:lucide-used-icons";
const LUCIDE_BUNDLE_RESOLVED_ID = "\0transitionforward:lucide-used-icons";
const MOTION_DIRECT_PREFIX = "transitionforward:motion-direct/";
const PREPARED_MOTION_ID = "transitionforward:prepared-motion-client";
const LOVABLE_VENDOR_DIRECTORY = new URL("./.transitionforward-build/vendor/", import.meta.url);
const LOVABLE_PREVIEW_ROOT_SHELL = new URL("./src/lovable-preview-root-shell.tsx", import.meta.url);
const isLovableSandbox =
  process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
const isLovablePreviewSpaBuild =
  isLovableSandbox && process.env.TRANSITIONFORWARD_LOVABLE_PREVIEW_SPA === "1";
const isConstrainedLovableClientBuild =
  isLovableSandbox && process.env[CHILD_BUILD_ENVIRONMENT_ENV] === "client";
const REVIEWED_MOTION_IMPORTERS = new Set([
  "/src/components/site/SiteFooter.tsx",
  "/src/components/site/SiteHeader.tsx",
  "/src/routes/__root.tsx",
  "/src/routes/about.tsx",
  "/src/routes/index.tsx",
  "/src/routes/programs.transitionforward.tsx",
  "/src/routes/research.tsx",
]);

const MOTION_DIRECT_MODULES = new Map<string, { relativePath: string; exportName: string }>([
  ["motion", { relativePath: "./render/components/m/proxy.mjs", exportName: "m" }],
  [
    "AnimatePresence",
    {
      relativePath: "./components/AnimatePresence/index.mjs",
      exportName: "AnimatePresence",
    },
  ],
  ["LazyMotion", { relativePath: "./components/LazyMotion/index.mjs", exportName: "LazyMotion" }],
  ["domMax", { relativePath: "./render/dom/features-max.mjs", exportName: "domMax" }],
  ["useInView", { relativePath: "./utils/use-in-view.mjs", exportName: "useInView" }],
  [
    "useReducedMotion",
    {
      relativePath: "./utils/reduced-motion/use-reduced-motion.mjs",
      exportName: "useReducedMotion",
    },
  ],
  ["useScroll", { relativePath: "./value/use-scroll.mjs", exportName: "useScroll" }],
  ["useSpring", { relativePath: "./value/use-spring.mjs", exportName: "useSpring" }],
  ["useTransform", { relativePath: "./value/use-transform.mjs", exportName: "useTransform" }],
]);

function resolveRequestedViteMode() {
  const childMode = process.env[CHILD_BUILD_MODE_ENV];
  if (childMode) return childMode;

  const requestedModeIndex = process.argv.indexOf("--mode");
  const requestedMode = requestedModeIndex >= 0 ? process.argv[requestedModeIndex + 1] : undefined;
  if (requestedModeIndex >= 0 && (!requestedMode || requestedMode.startsWith("--"))) {
    throw new Error("--mode requires a value");
  }
  if (requestedMode) return requestedMode;

  return process.argv.some((argument) => argument === "dev" || argument === "serve")
    ? "development"
    : "production";
}

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

function usePreparedLovableVendorBundles(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const reactDayPickerBundle = fileURLToPath(
    new URL("react-day-picker.mjs", LOVABLE_VENDOR_DIRECTORY),
  );
  const sentryBrowserBundle = fileURLToPath(
    new URL("sentry-browser.mjs", LOVABLE_VENDOR_DIRECTORY),
  );
  const motionClientBundle = fileURLToPath(new URL("motion-client.mjs", LOVABLE_VENDOR_DIRECTORY));
  const reactMarkdownBundle = fileURLToPath(
    new URL("react-markdown.mjs", LOVABLE_VENDOR_DIRECTORY),
  );
  const remarkGfmBundle = fileURLToPath(new URL("remark-gfm.mjs", LOVABLE_VENDOR_DIRECTORY));
  const qrcodeBundle = fileURLToPath(new URL("qrcode-client.mjs", LOVABLE_VENDOR_DIRECTORY));
  const zodBundle = fileURLToPath(new URL("zod-client.mjs", LOVABLE_VENDOR_DIRECTORY));
  const dateFnsFormatBundle = fileURLToPath(
    new URL("date-fns-format.mjs", LOVABLE_VENDOR_DIRECTORY),
  );
  const preparedBundles = new Map([
    ["react-day-picker", reactDayPickerBundle],
    ["@sentry/browser", sentryBrowserBundle],
    ["@sentry/core/browser", sentryBrowserBundle],
    [PREPARED_MOTION_ID, motionClientBundle],
    ["react-markdown", reactMarkdownBundle],
    ["remark-gfm", remarkGfmBundle],
    ["qrcode", qrcodeBundle],
    ["zod", zodBundle],
    ["zod/v4/core", zodBundle],
    ["date-fns/format", dateFnsFormatBundle],
  ]);

  if (isLovableSandbox) {
    for (const [source, bundlePath] of preparedBundles) {
      let bundleSource = "";
      try {
        bundleSource = readFileSync(bundlePath, "utf8");
      } catch (error) {
        throw new Error(
          `Missing prepared Lovable vendor bundle for ${source}. Run prepare-lovable-vendor-bundles.mjs first.`,
          { cause: error },
        );
      }
      if (bundleSource.length < 10_000) {
        throw new Error(`Prepared Lovable vendor bundle for ${source} is unexpectedly small`);
      }
    }
  }

  return {
    name: "transitionforward:prepared-lovable-vendor-bundles",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => isLovableSandbox && environment.name === "client",
    resolveId(source, importer) {
      const bundlePath = preparedBundles.get(source);
      if (!bundlePath || !importer) return null;
      const normalizedImporter = importer.replaceAll("\\", "/").split("?", 1)[0];
      if (
        source === "react-day-picker" &&
        normalizedImporter.endsWith("/src/components/ui/calendar.tsx")
      ) {
        return bundlePath;
      }
      if (
        (source === "@sentry/browser" || source === "@sentry/core/browser") &&
        normalizedImporter.endsWith("/src/lib/sentry/init.ts")
      ) {
        return bundlePath;
      }
      if (
        source === PREPARED_MOTION_ID &&
        [...REVIEWED_MOTION_IMPORTERS].some((path) => normalizedImporter.endsWith(path))
      ) {
        return bundlePath;
      }
      if (
        (source === "react-markdown" || source === "remark-gfm") &&
        normalizedImporter.endsWith("/src/routes/blog.$slug.tsx")
      ) {
        return bundlePath;
      }
      if (
        source === "qrcode" &&
        normalizedImporter.endsWith("/src/routes/_authenticated/security.tsx")
      ) {
        return bundlePath;
      }
      if (source === "zod" && normalizedImporter.includes("/src/")) {
        return bundlePath;
      }
      if (
        source === "zod/v4/core" &&
        normalizedImporter.endsWith("/node_modules/@hookform/resolvers/zod/dist/zod.mjs")
      ) {
        return bundlePath;
      }
      if (
        source === "date-fns/format" &&
        (normalizedImporter.endsWith("/src/routes/_authenticated/district.reports.tsx") ||
          normalizedImporter.endsWith("/src/routes/_authenticated/school.reports.tsx"))
      ) {
        return bundlePath;
      }
      return null;
    },
    transform(source, id) {
      if (!/["']motion\/react["']/.test(source)) return null;
      const normalizedId = id.replaceAll("\\", "/").split("?", 1)[0];
      if (![...REVIEWED_MOTION_IMPORTERS].some((path) => normalizedId.endsWith(path))) {
        throw new Error(`Unreviewed motion/react importer in Lovable client build: ${id}`);
      }
      return source.replace(/(["'])motion\/react\1/g, `$1${PREPARED_MOTION_ID}$1`);
    },
  };
}

function useDirectMotionModules(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const framerMotionIndexUrl = import.meta.resolve("framer-motion");
  const directModulePaths = new Map(
    [...MOTION_DIRECT_MODULES].map(([exportName, { relativePath }]) => [
      `${MOTION_DIRECT_PREFIX}${exportName}`,
      fileURLToPath(new URL(relativePath, framerMotionIndexUrl)),
    ]),
  );
  const directExports = new Map<string, { moduleId: string; exportName: string }>();
  for (const [importedName, { exportName }] of MOTION_DIRECT_MODULES) {
    directExports.set(importedName, {
      moduleId: `${MOTION_DIRECT_PREFIX}${importedName}`,
      exportName,
    });
  }
  let rewrittenFiles = 0;
  let rewrittenExports = 0;

  return {
    name: "transitionforward:direct-motion-modules",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => isLovableSandbox && environment.name === "client",
    resolveId(source) {
      return directModulePaths.get(source) ?? null;
    },
    transform(source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      if (!normalizedId.includes("/src/") || !/\.[cm]?[jt]sx?$/.test(normalizedId)) {
        return null;
      }

      const result = rewriteMotionReactImports(source, directExports);
      if (result.rewrittenExports === 0) return null;

      rewrittenFiles += 1;
      rewrittenExports += result.rewrittenExports;
      return { code: result.code, map: null };
    },
    buildEnd() {
      console.info(
        `[direct-motion-modules] rewrote ${rewrittenExports.toLocaleString()} exports across ${rewrittenFiles.toLocaleString()} files`,
      );
    },
  };
}

function useDirectLucideIconModules(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const lucideBarrelUrl = import.meta.resolve("lucide-react/dist/esm/lucide-react.js");
  const lucideBarrelPath = fileURLToPath(lucideBarrelUrl);
  const lucideBarrel = readFileSync(lucideBarrelPath, "utf8");
  const iconModules = mapLucideIconModules(lucideBarrel);

  if (iconModules.size < 1_000) {
    throw new Error(
      `Could not map Lucide's ESM icon exports (found ${iconModules.size.toLocaleString()})`,
    );
  }
  const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));
  const usedIconExports = new Set<string>();
  const sourceDirectories = [sourceRoot];
  while (sourceDirectories.length > 0) {
    const directory = sourceDirectories.pop();
    if (!directory) break;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        sourceDirectories.push(entryPath);
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        const source = readFileSync(entryPath, "utf8");
        for (const exportName of collectLucideRuntimeExports(source, iconModules)) {
          usedIconExports.add(exportName);
        }
      }
    }
  }
  const iconBundle = createLucideIconBundle(usedIconExports, iconModules, (iconModule) =>
    readFileSync(fileURLToPath(new URL(`./icons/${iconModule}`, lucideBarrelUrl)), "utf8"),
  );
  let rewrittenFiles = 0;
  let rewrittenIcons = 0;

  return {
    name: "transitionforward:direct-lucide-icon-modules",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => isLovableSandbox && environment.name === "client",
    resolveId(source) {
      if (source === LUCIDE_BUNDLE_ID) return LUCIDE_BUNDLE_RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id === LUCIDE_BUNDLE_RESOLVED_ID) return iconBundle;
      return null;
    },
    transform(source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      if (!normalizedId.includes("/src/") || !/\.[cm]?[jt]sx?$/.test(normalizedId)) {
        return null;
      }

      const result = rewriteLucideReactImportsFromBundle(source, iconModules, LUCIDE_BUNDLE_ID);
      if (result.rewrittenIcons === 0) return null;

      rewrittenFiles += 1;
      rewrittenIcons += result.rewrittenIcons;
      return { code: result.code, map: null };
    },
    buildEnd() {
      console.info(
        `[direct-lucide-icon-modules] bundled ${usedIconExports.size.toLocaleString()} used icon exports and rewrote ${rewrittenIcons.toLocaleString()} imports across ${rewrittenFiles.toLocaleString()} files`,
      );
    },
  };
}

function useDirectDateFnsModules(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const dateFnsIndexPath = fileURLToPath(import.meta.resolve("date-fns"));
  const dateFnsIndex = readFileSync(dateFnsIndexPath, "utf8");
  const functionModules = mapDateFnsModules(dateFnsIndex);

  if (functionModules.size < 200) {
    throw new Error(
      `Could not map date-fns function exports (found ${functionModules.size.toLocaleString()})`,
    );
  }
  let rewrittenFiles = 0;
  let rewrittenFunctions = 0;

  return {
    name: "transitionforward:direct-date-fns-modules",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => isLovableSandbox && environment.name === "client",
    transform(source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      const isApplicationSource = normalizedId.includes("/src/");
      const isReactDayPicker = normalizedId.includes("/node_modules/react-day-picker/");
      if ((!isApplicationSource && !isReactDayPicker) || !/\.[cm]?[jt]sx?$/.test(normalizedId)) {
        return null;
      }

      const result = rewriteDateFnsImports(source, functionModules);
      if (result.rewrittenFunctions === 0) return null;

      rewrittenFiles += 1;
      rewrittenFunctions += result.rewrittenFunctions;
      return { code: result.code, map: null };
    },
    buildEnd() {
      console.info(
        `[direct-date-fns-modules] rewrote ${rewrittenFunctions.toLocaleString()} function imports across ${rewrittenFiles.toLocaleString()} files`,
      );
    },
  };
}

function stubUnusedJsPdfOptionalRenderers(): Plugin {
  const isLovableSandbox =
    process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);
  const optionalRenderers = new Set(["canvg", "dompurify", "html2canvas"]);

  return {
    name: "transitionforward:stub-unused-jspdf-optional-renderers",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => isLovableSandbox && environment.name === "client",
    resolveId(source, importer) {
      if (!importer || !optionalRenderers.has(source)) return null;
      const normalizedImporter = importer.replaceAll("\\", "/");
      if (!normalizedImporter.includes("/node_modules/jspdf/")) return null;
      return `${JSPDF_OPTIONAL_RENDERER_STUB_PREFIX}${source}`;
    },
    load(id) {
      if (!id.startsWith(JSPDF_OPTIONAL_RENDERER_STUB_PREFIX)) return null;
      const renderer = id.slice(JSPDF_OPTIONAL_RENDERER_STUB_PREFIX.length);
      const message = `The unused jsPDF ${renderer} renderer is not included in the constrained Lovable build.`;
      if (renderer === "canvg") {
        return `const unsupported = () => { throw new Error(${JSON.stringify(message)}); };\nexport const Canvg = { from: unsupported, fromString: unsupported };\nexport default { Canvg };\n`;
      }
      if (renderer === "dompurify") {
        return `const unsupported = () => { throw new Error(${JSON.stringify(message)}); };\nexport default { sanitize: unsupported };\n`;
      }
      return `export default function unsupported() { throw new Error(${JSON.stringify(message)}); }\n`;
    },
  };
}

function splitLovableBuildEnvironments(): Plugin {
  const requestedMode = resolveRequestedViteMode();
  const environmentBuilder = fileURLToPath(
    new URL("./scripts/build-environment.mjs", import.meta.url),
  );

  function buildInChildProcess(environmentName: "client" | "ssr") {
    return new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [environmentBuilder, environmentName, requestedMode], {
        env: {
          ...process.env,
          // The reduced client and SSR graphs fit within this lower cap. Keep
          // the parent process's additional headroom for Nitro's final
          // single-file fetch bundle instead of giving every phase one limit.
          NODE_OPTIONS: LOVABLE_CHILD_NODE_OPTIONS,
          [CHILD_BUILD_MODE_ENV]: requestedMode,
          [CHILD_BUILD_ENVIRONMENT_ENV]: environmentName,
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

function publicClientOnlyRouteHead(routePath: string) {
  if (routePath === "/share/$token") {
    return {
      meta: [
        { title: "Shared Pathway Report — TransitionForward" },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:url", content: "/share/$token" },
      ],
      links: [{ rel: "canonical", href: "/share/$token" }],
    };
  }

  if (routePath === "/demo") {
    const description = "Preview TransitionForward by role using fictional sample data.";
    return {
      meta: [
        { title: "Demo — Preview TransitionForward by role" },
        { name: "description", content: description },
        { property: "og:title", content: "Demo — Preview TransitionForward by role" },
        { property: "og:description", content: description },
        { property: "og:url", content: "/demo" },
      ],
      links: [{ rel: "canonical", href: "/demo" }],
    };
  }

  return {
    meta: [
      { title: "Demo — TransitionForward" },
      {
        name: "description",
        content: "Interactive TransitionForward preview using fictional sample data.",
      },
      { name: "robots", content: "noindex" },
    ],
  };
}

function serverClientOnlyRouteStubs(): Plugin {
  return {
    name: "transitionforward:server-client-only-route-stubs",
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name !== "client",
    transform(source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      const isRouteModule =
        normalizedId.includes("/src/routes/") &&
        normalizedId.endsWith(".tsx") &&
        !normalizedId.endsWith("/src/routes/__root.tsx");
      const isAuthenticatedRoute =
        normalizedId.endsWith("/src/routes/_authenticated.tsx") ||
        (normalizedId.includes("/src/routes/_authenticated/") && normalizedId.endsWith(".tsx"));
      const isPublicClientOnlyRoute =
        normalizedId.endsWith("/src/routes/demo.tsx") ||
        (normalizedId.includes("/src/routes/demo_") && normalizedId.endsWith(".tsx")) ||
        normalizedId.endsWith("/src/routes/share.$token.tsx");
      const isPreviewSpaRoute = isLovablePreviewSpaBuild && isRouteModule;
      if (!isAuthenticatedRoute && !isPublicClientOnlyRoute && !isPreviewSpaRoute) return null;

      // The authenticated subtree restores identity from browser storage. The
      // public demo routes restore fictional demo state from the browser, and
      // the shared report resolves its token after mount. Their full components
      // therefore do not produce useful server HTML, but Nitro would otherwise
      // inline both browser UI graphs into Lovable's single-file fetch bundle.
      // Refuse to stub any route that gains an inline server primitive; those
      // handlers must first move to a dedicated *.functions.ts or server route.
      if (/\bcreate(?:ServerFn|ServerOnlyFn|Middleware|ServerFileRoute)\b/.test(source)) {
        throw new Error(
          `[server-client-only-route-stubs] ${normalizedId} contains an inline server primitive`,
        );
      }

      const routeMatch = source.match(/\bcreateFileRoute\(\s*(["'`])([^"'`]+)\1\s*\)/);
      if (!routeMatch) {
        throw new Error(
          `[server-client-only-route-stubs] Could not identify the route path in ${normalizedId}`,
        );
      }

      const routePath = routeMatch[2];
      const publicHead = isPublicClientOnlyRoute && !isPreviewSpaRoute
        ? `, head: () => (${JSON.stringify(publicClientOnlyRouteHead(routePath))})`
        : "";
      return {
        code: `import { createFileRoute } from "@tanstack/react-router";\nexport const Route = createFileRoute(${JSON.stringify(routePath)})({ ssr: false${publicHead} });\n`,
        map: null,
      };
    },
  };
}

function lovablePreviewRootShell(): Plugin {
  const previewRootShellSource = isLovablePreviewSpaBuild
    ? readFileSync(LOVABLE_PREVIEW_ROOT_SHELL, "utf8")
    : "";

  return {
    name: "transitionforward:lovable-preview-root-shell",
    enforce: "pre",
    apply: "build",
    applyToEnvironment: (environment) =>
      isLovablePreviewSpaBuild && environment.name !== "client",
    transform(_source, id) {
      const normalizedId = id.split("?", 1)[0].replaceAll("\\", "/");
      if (!normalizedId.endsWith("/src/routes/__root.tsx")) return null;
      return { code: previewRootShellSource, map: null };
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
const requestedViteMode = resolveRequestedViteMode();
const publicBuildEnv = loadEnv(requestedViteMode, process.cwd(), "VITE_");
const viteAppEnv = process.env.VITE_APP_ENV ?? publicBuildEnv.VITE_APP_ENV ?? "";
const paymentsClientToken =
  process.env.VITE_PAYMENTS_CLIENT_TOKEN ?? publicBuildEnv.VITE_PAYMENTS_CLIENT_TOKEN ?? "";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Lovable preview is a browser-rendered shell backed by the same server
    // functions. Protected staging and production omit this flag and retain
    // full route SSR for SEO, initial-load performance, and release parity.
    ...(isLovablePreviewSpaBuild
      ? { spa: { enabled: true, prerender: { outputPath: "/index" } } }
      : {}),
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
        output: {
          // The client currently emits hundreds of tiny route chunks. Let
          // Rollup merge only sub-20 KiB chunks in the constrained Lovable
          // client child, reducing simultaneous render/output bookkeeping.
          // Other build environments retain Rollup's default threshold.
          experimentalMinChunkSize: isConstrainedLovableClientBuild ? 20_000 : 1,
        },
      },
    },
    define: {
      "import.meta.env.APP_ENV": JSON.stringify(appEnv),
      // Lovable's production publisher retains explicit user defines in the
      // Nitro server bundle. Keep these reviewed public build values explicit
      // so the live identity endpoint sees the same mode as the browser app.
      "import.meta.env.VITE_APP_ENV": JSON.stringify(viteAppEnv),
      "import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN": JSON.stringify(paymentsClientToken),
      "import.meta.env.VITE_APP_BUILD_SHA": JSON.stringify(appBuildSha),
      "import.meta.env.VITE_APP_BUILD_TIME": JSON.stringify(appBuildTime),
      "import.meta.env.TRANSITIONFORWARD_LOVABLE_PREVIEW_SPA": JSON.stringify(
        isLovablePreviewSpaBuild ? "1" : "",
      ),
    },
    // Keep Lovable's supported Vite application-build entrypoint, but release
    // the client and SSR graphs in child processes before Nitro creates the
    // single fetch bundle. Workbox runs afterward from the package script.
    plugins: [
      stubUnusedJsPdfOptionalRenderers(),
      usePreparedLovableVendorBundles(),
      useDirectDateFnsModules(),
      useDirectLucideIconModules(),
      useDirectMotionModules(),
      splitLovableBuildEnvironments(),
      lovablePreviewRootShell(),
      serverClientOnlyRouteStubs(),
      buildEnvironmentGarbageCollector(),
    ],
  },
});
