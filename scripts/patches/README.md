# Build Compiler Cache Patch

`@tanstack/start-plugin-core@1.171.49` retains per-environment compiler module/AST caches after the build transform phase. The pinned Bun patch releases that environment's compiler at `buildEnd`, before chunk rendering. The separate server-function registry remains available for the split client/SSR handoff. Development/HMR caches are preserved. Both the TypeScript source and the package's executed ESM file are patched; dependency versions and the existing 1,216 MiB old-space cap are unchanged.

`TF_BUILD_CACHE_METRICS=1` logs only the environment name and whether a compiler was released. `TF_BUILD_RELEASE_COMPILER_CACHE=0` is a build-only diagnostic control for comparison with the original lifecycle; ordinary builds enable the patch. These flags do not select services or alter authorization.

The real dependency lifecycle test runs before CI builds. It verifies cache release, development retention, unchanged resolver metadata, callable registered functions and rejection of unknown function IDs. Local capped Node 22 comparisons also check complete client/server JavaScript and CSS hashes. Passing local builds are not hosted Lovable memory acceptance.

A clean `bun install --frozen-lockfile` must apply this patch. When changing the pinned framework version, review whether upstream has fixed the cache lifetime, remove or rebase this patch deliberately, and repeat lifecycle, full build and server-function handoff verification. Do not silently drop the patch or increase the heap cap to hide a regression.
