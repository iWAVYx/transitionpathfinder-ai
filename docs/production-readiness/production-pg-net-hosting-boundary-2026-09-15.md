# Production pg_net hosting boundary — 2026-09-15

## Decision

**SELECT-ONLY EVIDENCE COMPLETE; FINDING 9 REMAINS OPEN; PRODUCTION REMAINS
NO-GO.** The evidence supports a platform-managed metadata-namespace
disposition, not an automatic migration. No extension, database object,
migration, data, bucket, policy, secret, deployment, Lovable setting, staging
resource, Stripe setting, Cloudflare setting, or production configuration was
changed.

## Target and limits

- Lovable production project: `a4a5068b-10df-4e31-8d22-73186657d452`.
- Previously established production Supabase ref: `lrqcntqyekucamifpffs`.
- Reusable query: `production-pg-net-dependency-inventory.sql`.
- The live inventory returned catalog identities, schemas, ownership, extension
  capability, and catalog dependency edges only.
- It did not read function bodies, cron commands, application rows, uploaded
  files, auth users, credentials, tokens, or secrets.

## Extension identity

The production catalog reported:

- extension: `pg_net`;
- version: `0.20.3`;
- extension metadata namespace: `public`;
- extension owner: `supabase_admin`;
- relocatable: `false`;
- required schema: `NULL`.

Because PostgreSQL marks this installation non-relocatable, a simple
`ALTER EXTENSION ... SET SCHEMA` is not an available remediation. This record
does not authorize dropping, reinstalling, upgrading, or altering the
extension.

## Extension members

The extension owns 28 catalog members. Every member with a schema is in `net`;
the schema member itself has no parent schema. Zero members are in `public`, and
every member is owned by `supabase_admin`.

### Functions (12)

- `net._await_response(bigint)`
- `net._encode_url_with_params_array(pg_catalog.text,pg_catalog.text[])`
- `net._http_collect_response(bigint,boolean)`
- `net._urlencode_string(character varying)`
- `net.check_worker_is_up()`
- `net.http_collect_response(bigint,boolean)`
- `net.http_delete(pg_catalog.text,pg_catalog.jsonb,pg_catalog.jsonb,integer,pg_catalog.jsonb)`
- `net.http_get(pg_catalog.text,pg_catalog.jsonb,pg_catalog.jsonb,integer)`
- `net.http_post(pg_catalog.text,pg_catalog.jsonb,pg_catalog.jsonb,pg_catalog.jsonb,integer)`
- `net.wait_until_running()`
- `net.wake()`
- `net.worker_restart()`

### Schema, sequence, and tables

- schema: `net`
- sequence: `net.http_request_queue_id_seq`
- table: `net._http_response`
- table: `net.http_request_queue`

### Types (12)

- `net._http_response[]`
- `net.http_method[]`
- `net.http_request_queue[]`
- `net._http_response`
- `net.http_response[]`
- `net.http_response_result[]`
- `net.request_status[]`
- `net.http_method`
- `net.http_request_queue`
- `net.http_response`
- `net.http_response_result`
- `net.request_status`

## Catalog dependency relationships

The inbound query returned nine PostgreSQL-managed structural relationships:

- the composite types for `net.http_response` and
  `net.http_response_result` depend internally on the matching extension types;
- the `response` and `status` composite columns depend normally on
  `net.http_response` and `net.request_status`;
- the `net.http_request_queue.id` default depends normally on
  `net.http_request_queue_id_seq`;
- `http_method_check` and `net.http_request_queue.method` depend on
  `net.http_method`;
- the two `pg_toast` tables depend internally on
  `net.http_request_queue` and `net._http_response`.

No external application routine, view, or trigger appeared as a catalog-tracked
inbound dependency.

The outbound query returned eight relationships:

- `net.http_collect_response`, `net.check_worker_is_up`,
  `net._await_response`, `net.http_get`, `net.http_post`, `net.http_delete`, and
  `net._http_collect_response` normally depend on the `plpgsql` language;
- `net.http_request_queue_id_seq` has an automatic dependency on
  `net.http_request_queue.id`.

PostgreSQL does not necessarily register calls written inside procedural
function bodies or cron command strings as catalog dependency edges. Those
sources were deliberately not read. Therefore, the absence of an external
catalog edge is not evidence that a drop/reinstall would be safe.

## Finding 9 disposition boundary

The scanner-visible condition is real at the extension-registration level:
`pg_extension.extnamespace` resolves to `public`. The member inventory also
shows that no actual `pg_net` member object is exposed in `public`; all concrete
objects are isolated under the extension-owned `net` schema and owned by the
platform role `supabase_admin`.

Finding 9 is not closed by this evidence. Before accepting it as a
platform-managed exception, the release record still needs a reviewed
disposition and confirmation that Lovable/Supabase supports the installed
layout. Any destructive reinstall requires a separate dependency/recovery
plan, isolated proof, and explicit authorization.

## Reusable fail-closed check

The final statement in `production-pg-net-dependency-inventory.sql` succeeds
only when all of these conditions hold:

1. exactly one `pg_net` extension exists;
2. it owns at least one catalog member;
3. zero member objects are in `public`;
4. every member is owned by `supabase_admin`;
5. its metadata namespace is `public`;
6. the extension itself is owned by `supabase_admin`; and
7. it remains non-relocatable.

If any condition is false or unknown, the SELECT-only `boundary_guard` divides
by zero and the query fails instead of reporting a misleading pass.
