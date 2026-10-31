# PR211 Hosting Boundary Review — October 15, 2026

Source reviewed: draft `9281abdfe198a20ae68ed9d926bda487bd37392b`, compared with the previous inventory recorded at `f96faa61`. This reconciles a source-file inventory gate, not whole-PR security approval or hosting/release authorization. Production remains NO-GO. No endpoint, credential, role, database or hosting setting changed during review.

## Reviewed additions

| File | Boundary evidence | Remaining acceptance |
| --- | --- | --- |
| `src/lib/dashboard/organization-widget-actions.functions.ts` | Existing `requireSupabaseAuth`; reads use authenticated `context.supabase`, `userId`, active organization membership, caller-owned organization actions and registered role destinations. No service client, provider or credential import. | Actual role/membership/RLS, source-context freshness and hosted destination acceptance. |
| `src/lib/dashboard/student-hub-context.functions.ts` | Existing auth middleware and negative viewer intent; caller-filtered recorded roles and linked student reads; explicit management-only state and ambiguous/missing handling. No privileged fallback or first accessible team profile. | Actual multi-role/Owner/student/RLS and hosted refresh/navigation acceptance. |
| `src/lib/organization-history.functions.ts` | Existing auth middleware; caller-RLS history resolver checks active organization memberships, district type/child scopes and permitted student organization IDs. No privileged client or new source of credentials. | Actual school/district/denial and history/export acceptance. |

These source checks assess hosting responsibility and credential boundaries; they do not establish comprehensive policy correctness or grant private planning access. Existing scoped tests are supplementary local evidence, not a substitute for actual signed-in permission testing.

The dormant connection adapter has no `createServerFn`, production dependency assembly or application imports. It adds no current endpoint. Its mocked port tests are not actual authentication or database evidence.

## Recalculated inventory

Using the unchanged sorted-path SHA256 algorithm from `tests/hosting-portability-boundary.test.mjs`:

| Surface | Count | SHA256 | Change |
| --- | ---: | --- | --- |
| Public top-level routes | 68 | `03d25a10539bb65319e104d1169be19aa6c54a1df8ac7c41e16b095195496db3` | None |
| Authenticated routes | 139 | `40f2de5928515e23002fe1833f0f01cf26652579e7b1938c462286cac250bf7f` | None |
| Server-function files | 122 | `498c642ac88d377a624a0b8deb517691c8c46e9c22383dbbd3bb63d3311df71e` | Three additions, no removals |
| Privileged runtime files | 63 | `eef7a2018dc3d1d726a85cb0fdcacbab7f224f8c8a7f1a2365bc7a053a217337` | None |
| Explicit API/Lovable endpoint files | 12 | `396ec76eb0f5b9fe208d98c87c2ae5bd3a691823c90807f7128acd24b6bd853d` | None |

Only the reviewed server-function count/hash changes in the policy; prior review history is retained. Test thresholds and fail-closed production controls are unchanged. Lovable remains the designated production application/privileged runtime, Cloudflare remains the edge/isolated-staging responsibility, and production Worker deployment/publish authorization remains false.


## Local Validation of the Release Fix

The exact inventory/readiness contract passes all 44 cases; the combined credential-free release/security/auth/navigation set passes 103. The full suite passes 284 files / 4,087 tests and TypeScript. These tests validate the source contract and mocked paths, not actual hosted authorization. The first patched framework/router package set also passes the high/critical advisory gate, frozen install and an environment-free isolated staging build. Eight findings below the audit threshold are not cleared by that result. The generated route file is reordered by the patched generator; all 220 runtime update definitions, type route mappings and import sets remain identical. No inventory test or production authorization was weakened. Hosted exact-commit build/readiness evidence must be obtained after push.
