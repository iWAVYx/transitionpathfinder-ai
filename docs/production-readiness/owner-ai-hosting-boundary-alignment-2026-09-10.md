# Owner AI hosting-boundary alignment — 2026-09-10

Decision: **BOUNDARY REVIEWED; production remains NO-GO.** This record aligns
the fail-closed hosting inventory after PR #112 added the manual Owner-only
Lovable AI smoke test. It does not authorize a build, AI request, deployment,
publish, migration, DNS change, secret change, or production action.

## Reviewed source

The reviewed protected `main` SHA is
`17ddf10efcc71f2f46eff7babc6e1828ed05fa37`. Relative to the previously pinned
inventory, it adds one server-function file:

- `src/lib/owner/ai-smoke-test.functions.ts`

The file is also a privileged-runtime file because it reads the server-only
`LOVABLE_API_KEY`. Its approved runtime remains Lovable Cloud. It is not a new
public API endpoint and it does not authorize moving that credential to the
browser, GitHub, Cloudflare, or any other runtime.

The function requires an authenticated session and an exact
`admin_roles.role = 'platform_owner'` record. It accepts no user input, uses a
fixed fictional sample after the existing sensitive-text redactor succeeds,
and contains no database or storage mutation. It returns only status metadata;
the prompt and model output are not persisted or displayed.

## Recalculated inventory

The inventory was recalculated with the same sorted repository-relative path
normalization and SHA-256 algorithm enforced by
`tests/hosting-portability-boundary.test.mjs`.

| Surface | Files | SHA-256 | Change |
| --- | ---: | --- | --- |
| Public top-level routes | 68 | `03d25a10539bb65319e104d1169be19aa6c54a1df8ac7c41e16b095195496db3` | None |
| Authenticated routes | 138 | `da45ef2a591f2b2c2d91924f30c6a4b9268af97fac3f7efda787aef24fdb9ba6` | None |
| Server-function files | 117 | `1e5a20619ba7bd9e984776465efdb67bf7d7054fe2b3bddad15ff983bb7906c2` | +1 reviewed file |
| Privileged-runtime files | 61 | `b59f97e471d66361bd48a12c3d7969b17955c6b643d4e73a523ab1a6352a710c` | +1 reviewed file |
| Explicit API/Lovable endpoints | 11 | `3e4b9dba31c85523010e064be8e726691303eba71dcd91dbf93987e3fdceb863` | None |

## Unchanged controls

- Lovable Cloud remains the application origin and privileged runtime.
- Cloudflare remains edge protection plus isolated staging; a production
  application Worker is not authorized.
- Production publishing remains manual and separately authorized.
- The smoke test remains manual and must not run during builds, health refresh,
  deployment, or page load.
- The production release status remains **NO-GO** until the independent release
  checklist is completed with evidence.

