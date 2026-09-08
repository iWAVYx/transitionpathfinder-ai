# SECURITY DEFINER grant hardening — 2026-09-07

Decision: **DRAFT CODE READY FOR REVIEW; NOT APPLIED TO ANY DATABASE**.
Production remains **NO-GO**.

The isolated-staging inventory after PR #98 found 74 `public`-schema
`SECURITY DEFINER` routines. All 74 have explicit search paths, but inherited or
explicit grants still made 17 executable by PUBLIC, 24 by anonymous callers,
and 68 by authenticated callers.

The proposed migration resets those client grants and restores only the
machine-readable allowlists in `security-definer-execute-allowlist.json`:

- PUBLIC: 0 routines;
- anonymous: 5 reviewed public/share/unsubscribe entry points;
- authenticated: 54 caller-authorized RPC or RLS-helper routines;
- client-forbidden: 20 trigger, queue, retention, or scheduled internal routines;
- service role: all 74 routines.

The migration does not change function bodies, RLS policies, extensions, auth
users, application data, DNS, secrets, or production. It prevents new functions
created by the migration role from inheriting PUBLIC execution and aborts its
own transaction if the live catalog does not exactly match the reviewed
allowlists.

A read-only query against isolated staging resolved all 74 reviewed signatures
to current routines (`reviewed_count=74`, `missing_count=0`). No grants or other
database state were changed by that preflight.

Before any merge or database application:

1. the credential-free contract tests and full disposable migration replay must
   pass;
2. reviewers must confirm all 5 anonymous and 54 authenticated entries remain
   necessary;
3. after separate authorization, the exact migration may be applied to isolated
   staging only;
4. protected permission, RLS, cross-district, role, and browser suites must pass;
5. the Lovable scan must be refreshed and compared with the live catalog.

This draft does not authorize a staging or production migration, Lovable build
or publish, deployment, DNS or secret change, or payment.
