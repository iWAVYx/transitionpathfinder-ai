import { spawn } from "node:child_process";
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

const splitHeavyBuildEnvironmentsPlugin = {
  name: "transitionforward:split-heavy-build-environments",
  async buildApp(builder) {
    const client = builder.environments.client;
    const ssr = builder.environments.ssr;
    if (!client) {
      throw new Error("The client build environment is required");
    }
    if (!ssr) {
      throw new Error("The SSR build environment is required");
    }

    // Nitro's pre-build hook prepares the output directory before this normal
    // buildApp hook runs. Build the two memory-heavy Vite environments in
    // separate processes so their build graphs are released before the parent
    // process runs Nitro and every post-build hook.
    await runNodeScript(environmentBuilder, ["client", mode]);
    client.isBuilt = true;
    await runNodeScript(environmentBuilder, ["ssr", mode]);
    ssr.isBuilt = true;
  },
};

const builder = await createBuilder({
  configFile,
  mode,
  plugins: [splitHeavyBuildEnvironmentsPlugin],
});
const clientOutputDirectory = builder.environments.client?.config.build.outDir;
if (!clientOutputDirectory) {
  throw new Error("The client output directory is required");
}

await builder.buildApp();

await runNodeScript(serviceWorkerBuilder, [clientOutputDirectory]);
