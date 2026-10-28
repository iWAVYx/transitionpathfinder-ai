import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("@tanstack/start-plugin-core/package.json"));
const { startCompilerPlugin } = await import(pathToFileURL(join(packageRoot,
  "dist/esm/vite/start-compiler-plugin/plugin.js")));

async function fixture(t, mode = "build", disabled = false) {
  const root = await mkdtemp(join(tmpdir(), "tf-compiler-lifecycle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = { metrics: process.env.TF_BUILD_CACHE_METRICS, disabled: process.env.TF_BUILD_RELEASE_COMPILER_CACHE };
  process.env.TF_BUILD_CACHE_METRICS = "1";
  if (disabled) process.env.TF_BUILD_RELEASE_COMPILER_CACHE = "0";
  else delete process.env.TF_BUILD_RELEASE_COMPILER_CACHE;
  t.after(() => {
    for (const [name, value] of [["TF_BUILD_CACHE_METRICS", original.metrics], ["TF_BUILD_RELEASE_COMPILER_CACHE", original.disabled]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  const messages = [];
  t.mock.method(console, "info", (message) => messages.push(message));
  const plugins = startCompilerPlugin({ framework: "react", providerEnvName: "ssr",
    environments: [{ name: "client", type: "client" }, { name: "ssr", type: "server" }] });
  const client = plugins.find((p) => p.name === "tanstack-start-core::server-fn:client");
  const context = { environment: { name: "client", mode },
    warn(message) { throw Error(message); }, error(message) { throw Error(message); },
    load: async () => ({ code: "" }), resolve: async (id) => ({ id, external: true }) };
  client.configResolved({ root, experimental: {} });
  const compiled = await client.transform.handler.call(context,
    "import { createServerFn } from '@tanstack/react-start'; export const sample = createServerFn().handler(async () => 'private fixture');",
    join(root, "fixture.mjs"));
  assert.match(compiled.code, /createClientRpc/);
  assert.doesNotMatch(compiled.code, /private fixture/);
  return { root, client, context, messages, plugins, compiled };
}

test("build releases compiler caches while preserving the callable server-function registry", async (t) => {
  const f = await fixture(t);
  const resolver = f.plugins.find((p) => p.name === "tanstack-start-core:server-fn-resolver");
  const id = resolver.resolveId.handler("#tanstack-start-server-fn-resolver");
  const context = { environment: { name: "ssr", mode: "build" } };
  const before = resolver.load.handler.call(context, id);
  f.client.buildEnd.call(f.context);
  assert.deepEqual(f.messages, ["[start-compiler-cache] client: released"]);
  const after = resolver.load.handler.call(context, id);
  assert.equal(after, before, "release must not remove or alter discovered server functions");
  f.client.buildEnd.call(f.context);
  assert.equal(f.messages.at(-1), "[start-compiler-cache] client: empty");
  const server = f.plugins.find((p) => p.name === "tanstack-start-core::server-fn:ssr");
  const serverContext = { ...f.context, environment: { name: "ssr", mode: "build" } };
  await server.transform.handler.call(serverContext,
    "import { createServerFn } from '@tanstack/react-start'; export const sample = createServerFn().handler(async () => 'private fixture');",
    join(f.root, "fixture.mjs"));
  const beforeServerEnd = resolver.load.handler.call(context, id);
  server.buildEnd.call(serverContext);
  assert.equal(f.messages.at(-1), "[start-compiler-cache] ssr: released");
  assert.equal(resolver.load.handler.call(context, id), beforeServerEnd);
  // Use the actual discovered split-module name and export; no network/provider calls.
  const functionName = after.match(/functionName: '([^']+)'/)[1];
  await writeFile(join(f.root, "fixture.mjs"), `export function ${functionName}() { return 'fixture result'; }`);
  const resolverFile = join(f.root, "resolver.mjs");
  await writeFile(resolverFile, after);
  const { getServerFnById } = await import(pathToFileURL(resolverFile));
  const fnId = f.compiled.code.match(/createClientRpc\("([^"]+)"/)[1];
  assert.equal((await getServerFnById(fnId, { origin: "client" }))(), "fixture result");
  await assert.rejects(getServerFnById("not-registered", { origin: "client" }), /Server function info not found/);
});

test("dev completion retains compiler state for HMR", async (t) => {
  const f = await fixture(t, "dev");
  f.client.buildEnd.call(f.context);
  assert.deepEqual(f.messages, []);
  // The same compiler must still exist after the dev hook.
  f.context.environment.mode = "build";
  f.client.buildEnd.call(f.context);
  assert.deepEqual(f.messages, ["[start-compiler-cache] client: released"]);
});

test("diagnostic control preserves the unpatched build lifecycle", async (t) => {
  const f = await fixture(t, "build", true);
  f.client.buildEnd.call(f.context);
  assert.deepEqual(f.messages, []);
  delete process.env.TF_BUILD_RELEASE_COMPILER_CACHE;
  f.client.buildEnd.call(f.context);
  assert.deepEqual(f.messages, ["[start-compiler-cache] client: released"]);
});
