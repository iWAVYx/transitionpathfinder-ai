import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const isLovableSandbox =
  process.env.LOVABLE_SANDBOX === "1" || Boolean(process.env.DEV_SERVER__PROJECT_PATH);

if (isLovableSandbox) {
  const outputDirectory = fileURLToPath(
    new URL("../.transitionforward-build/vendor/", import.meta.url),
  );
  await mkdir(outputDirectory, { recursive: true });

  const sharedOptions = {
    bundle: true,
    conditions: ["browser", "production"],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    format: "esm",
    legalComments: "none",
    minify: true,
    platform: "browser",
    sourcemap: false,
    target: "es2022",
    treeShaking: true,
  };

  const bundles = [
    {
      name: "react-day-picker",
      contents: 'export { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";',
      external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    {
      name: "sentry-browser",
      contents: [
        'export { captureMessage, init, normalizeStringifyValue, setContext } from "@sentry/browser";',
        'export { applySdkMetadata, isSyntheticEvent, setNormalizeStringifier } from "@sentry/core/browser";',
      ].join("\n"),
      external: [],
    },
    {
      name: "motion-client",
      contents:
        'export { AnimatePresence, LazyMotion, domMax, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";',
      external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    {
      name: "react-markdown",
      contents: 'export { default } from "react-markdown";',
      external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    {
      name: "remark-gfm",
      contents: 'export { default } from "remark-gfm";',
      external: [],
    },
    {
      name: "qrcode-client",
      contents: 'export { default } from "qrcode";',
      external: [],
    },
    {
      name: "zod-client",
      contents: [
        'export * from "zod";',
        'export { $ZodError, parse, parseAsync } from "zod/v4/core";',
      ].join("\n"),
      external: [],
    },
    {
      name: "date-fns-format",
      contents: 'export { format } from "date-fns/format";',
      external: [],
    },
  ];

  for (const bundle of bundles) {
    const result = await build({
      ...sharedOptions,
      external: bundle.external,
      metafile: true,
      outfile: `${outputDirectory}/${bundle.name}.mjs`,
      stdin: {
        contents: bundle.contents,
        resolveDir: process.cwd(),
        sourcefile: `${bundle.name}.entry.mjs`,
      },
    });
    const bytes = Object.values(result.metafile.outputs).reduce(
      (total, output) => total + output.bytes,
      0,
    );
    console.info(
      `[prepare-lovable-vendor-bundles] ${bundle.name}: ${bytes.toLocaleString()} bytes`,
    );
  }
}
