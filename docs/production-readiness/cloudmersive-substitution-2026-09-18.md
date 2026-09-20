# Cloudmersive malware-provider substitution — 2026-09-18

## Status

**DRAFT / CREDENTIAL-FREE / NOT DEPLOYED / NOT LIVE-TESTED**

Production remains **NO-GO**. This package does not create an account or API
key, change a secret, call an antivirus service, upload a file, deploy staging,
publish Lovable, change a database, or touch production.

The current approval boundary is **SYNTHETIC STAGING ONLY**. No real student,
family, educator, IEP, health, or district file may be sent to Cloudmersive.

## Why this package exists

The existing OPSWAT integration could not complete the protected live proof
without a paid private-scanning entitlement. Cloudmersive was selected as the
fastest practical replacement candidate because its API accepts a quarantined
file directly and returns a synchronous clean/non-clean result.

## Implemented boundary

- Server-only `CLOUDMERSIVE_API_KEY`; no client-exposed key.
- `POST https://api.cloudmersive.com/virus/scan/file/advanced` with the API key
  in the `Apikey` header.
- Executables, invalid files, scripts, password-protected files, macros, XML
  external entities, insecure deserialization, HTML, unsafe archives, OLE
  embedded objects, and unwanted actions are all disallowed.
- A file is released only when `CleanResult === true` and no virus name is
  reported.
- Named viruses map to `infected` and are eligible for the existing purge path.
- Policy blocks, malformed or contradictory responses, HTTP errors, missing
  credentials, size-limit violations, and timeouts remain quarantined.
- The provider receives only a neutral filename such as `upload.pdf`; the
  student's original filename and storage path are not sent. Provider-returned
  filenames are never copied into application audit data.
- Existing private-bucket, clean-only download, RLS, purge, and audit behavior
  remains in place.

## File-size decision

The adapter defaults to **3,500,000 bytes**, matching the current Cloudmersive
free evaluation limit. A reviewed paid plan may set
`CLOUDMERSIVE_MAX_SCAN_BYTES` up to the application's existing 25 MiB cap. An
invalid or excessive override falls back to the free-tier limit.

This means the free plan can prove the integration with small harmless test
files, but it is not sufficient for all real IEP documents unless the product
also adopts a 3.5 MB upload limit.

## Read-only vendor review — 2026-09-18

### Positive evidence

- Cloudmersive publicly describes applicable APIs as stateless and says payload
  data is processed transiently without retaining a copy after the transaction.
- Its security documentation advertises TLS 1.2 or later and selectable North
  American, European, UK, and APAC deployment regions.
- A public DPA and subprocessor inventory exist.

### Unresolved production blockers

- The DPA says it must be accepted by contacting Cloudmersive sales; merely
  creating a free account does not make the DPA effective.
- The public materials reviewed do not provide a clear FERPA or school-records
  commitment suitable for TransitionForward's student and IEP data.
- The terms say the standard APIs are not represented as HIPAA-suitable and
  require prior written consent before transmitting protected health
  information. Although school records are often governed by a different legal
  framework, IEP documents can contain sensitive health and disability data, so
  this uncertainty must remain closed rather than inferred away.
- The DPA permits processing in the United States and other countries where
  Cloudmersive or its subprocessors operate, and describes geographically
  dispersed replication. The exact region and cross-region behavior for the
  selected plan therefore need written confirmation.
- The public subprocessor list includes multiple infrastructure providers. We
  still need confirmation of which ones can process Virus Scan API payloads or
  metadata for our chosen region and plan.

### Required written answers before real-file or production approval

1. Countersigned or otherwise effective DPA for TransitionForward.
2. Written confirmation that the service and selected plan may process student
   records and minor data subject to FERPA, COPPA where applicable, Connecticut
   student-data obligations, and district contract requirements.
3. Exact processing region, whether payloads or metadata cross that region, and
   which subprocessors can access each category.
4. Confirmation that file bytes are not persisted, backed up, used for model or
   product training, sold, or used for advertising, plus the retention period
   for filenames, hashes, telemetry, logs, and scan results.
5. Incident-notification commitment, support-access controls, deletion process,
   and subprocessor-change notification terms.
6. Production plan, file-size limit, rate limit, support level, and availability
   commitment appropriate for district use.

Until those answers are reviewed and accepted, a free key may be used only for
one separately authorized synthetic staging proof. It must never receive a real
IEP or other user file.

## Remaining gates

1. Review Cloudmersive DPA, subprocessors, region, retention/deletion terms,
   security posture, and education-data suitability; obtain the written answers
   listed above.
2. Create a staging-only Cloudmersive account/key and store it only as the
   protected GitHub `staging` secret `STAGING_CLOUDMERSIVE_API_KEY`.
3. Review and merge this package, then deploy its exact merge SHA to isolated
   staging.
4. Run exactly one protected clean-file and harmless EICAR proof using only
   synthetic staging data.
5. Keep the upload feature gate closed until the proof passes.
6. Obtain separate authorization before any production secret, deployment,
   migration, or real student/IEP file is involved.

## Official references

- https://api.cloudmersive.com/docs/virus.asp
- https://www.cloudmersive.com/virus-api
- https://portal.cloudmersive.com/selectplan
- https://cloudmersive.com/security
