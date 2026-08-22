import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "vite";

const environmentName = process.argv[2];
const mode = process.argv[3] ?? "production";

if (!environmentName) {
  throw new Error("An environment name is required");
}

const builder = await createBuilder({
  configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  mode,
});

const environment = builder.environments[environmentName];
if (!environment) {
  throw new Error(
    `Unknown build environment ${JSON.stringify(environmentName)}. Available: ${Object.keys(builder.environments).join(", ")}`,
  );
}

await builder.build(environment);

if (environmentName === "client") {
  const ssrEnvironment = builder.environments.ssr;
  if (!ssrEnvironment) {
    throw new Error("The SSR build environment is required for the split client build");
  }

  await captureVirtualModule({
    pluginName: "tanstack-start:start-manifest-plugin",
    moduleId: "tanstack-start-manifest:v",
    environment: ssrEnvironment,
    outputUrl: new URL("../node_modules/.nitro/vite/split-client-manifest.mjs", import.meta.url),
  });
  await captureVirtualModule({
    pluginName: "tanstack-start-core:server-fn-resolver",
    moduleId: "#tanstack-start-server-fn-resolver",
    environment: ssrEnvironment,
    outputUrl: new URL("../node_modules/.nitro/vite/split-server-fn-resolver.mjs", import.meta.url),
  });
}

async function captureVirtualModule({ pluginName, moduleId, environment, outputUrl }) {
  const plugin = builder.config.plugins.find((candidate) => candidate.name === pluginName);
  const resolveModule =
    typeof plugin?.resolveId === "function" ? plugin.resolveId : plugin?.resolveId?.handler;
  const loadModule = typeof plugin?.load === "function" ? plugin.load : plugin?.load?.handler;

  if (!resolveModule || !loadModule) {
    throw new Error(`Required split-build plugin hooks are unavailable: ${pluginName}`);
  }

  const pluginContext = { environment };
  const resolvedId = await resolveModule.call(pluginContext, moduleId);
  const moduleSource = await loadModule.call(pluginContext, resolvedId);
  if (typeof moduleSource !== "string" || moduleSource.length < 1_000) {
    throw new Error(`The split client build produced an incomplete virtual module: ${moduleId}`);
  }

  const outputFile = fileURLToPath(outputUrl);
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, moduleSource, "utf8");
}
