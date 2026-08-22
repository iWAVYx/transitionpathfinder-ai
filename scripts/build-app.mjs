import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createBuilder } from "vite";

const requestedModeIndex = process.argv.indexOf("--mode");
const mode = requestedModeIndex >= 0 ? process.argv[requestedModeIndex + 1] : "production";
if (!mode || mode.startsWith("--")) {
  throw new Error("--mode requires a value");
}

const buildTime = process.env.VITE_APP_BUILD_TIME ?? new Date().toISOString();
const childEnvironment = {
  ...process.env,
  VITE_APP_BUILD_TIME: buildTime,
};

const environmentBuilder = fileURLToPath(new URL("./build-environment.mjs", import.meta.url));
const serviceWorkerBuilder = fileURLToPath(
  new URL("./generate-service-worker.mjs", import.meta.url),
);
const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const startManifestFile = fileURLToPath(
  new URL("../node_modules/.nitro/vite/split-client-manifest.mjs", import.meta.url),
);
const serverFnResolverFile = fileURLToPath(
  new URL("../node_modules/.nitro/vite/split-server-fn-resolver.mjs", import.meta.url),
);
const startManifestId = "tanstack-start-manifest:v";
const serverFnResolverId = "#tanstack-start-server-fn-resolver";
const resolvedStartManifestId = "\0transitionforward:split-start-manifest";
const resolvedServerFnResolverId = "\0transitionforward:split-server-fn-resolver";

function runNodeScript(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: childEnvironment,
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
          `${script} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

const splitClientBuildPlugin = {
  name: "transitionforward:split-client-build",
  enforce: "pre",
  resolveId: {
    order: "pre",
    handler(id) {
      if (id === startManifestId) {
        return resolvedStartManifestId;
      }
      if (id === serverFnResolverId) {
        return resolvedServerFnResolverId;
      }
    },
  },
  load: {
    order: "pre",
    async handler(id) {
      if (id === resolvedStartManifestId && this.environment.name === "ssr") {
        return readFile(startManifestFile, "utf8");
      }
      if (id === resolvedServerFnResolverId && this.environment.name === "ssr") {
        return readFile(serverFnResolverFile, "utf8");
      }
    },
  },
  async buildApp(builder) {
    const client = builder.environments.client;
    if (!client) {
      throw new Error("The client build environment is required");
    }

    // Nitro's pre-build hook prepares the output directory before this normal
    // buildApp hook runs. Build the largest environment in a fresh process,
    // then let the parent builder run SSR, Nitro, and every post-build hook.
    await runNodeScript(environmentBuilder, ["client", mode]);
    client.isBuilt = true;
  },
};

const builder = await createBuilder({
  configFile,
  mode,
  plugins: [splitClientBuildPlugin],
});
const clientOutputDirectory = builder.environments.client?.config.build.outDir;
if (!clientOutputDirectory) {
  throw new Error("The client output directory is required");
}

await builder.buildApp();

await runNodeScript(serviceWorkerBuilder, [clientOutputDirectory]);
