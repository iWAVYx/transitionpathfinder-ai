# Cloudmersive malware-provider substitution — 2026-09-18

## Status

**DEPLOYED TO ISOLATED STAGING / SYNTHETIC CHANNEL PROOF PASSED / PRODUCTION NOT APPROVED**

Production remains **NO-GO**. The reviewed adapter is deployed to isolated
staging and one protected synthetic channel-attachment clean/EICAR proof passed
on 2026-09-20. No real student/IEP file, production credential, production
database, Lovable publish, production DNS, or live payment was involved.

The current approval boundary is **SYNTHETIC STAGING ONLY**. No real student,
family, educator, IEP, health, or district file may be sent to Cloudmersive.

## Protected staging proof — 2026-09-20

Protected `main` SHA
`193bed60f8d3d4233aab7cc043709e52cb388790` was deployed to the isolated
staging Worker by run `35517198872`. Consolidated Release Readiness run
`35519846560` passed at exact-SHA parity.

Exactly one manual Channel Attachment Malware QA run, `35521640583`, then
passed using only the synthetic staging student and synthetic text files:

- the clean file received a clean Cloudmersive verdict, became downloadable
  through a signed private-bucket URL, and downloaded byte-for-byte correctly;
- the harmless EICAR test marker received an infected verdict, stayed
  unavailable, and was purged from storage;
- both verdicts produced sanitized audit events without the submitted filename
  or storage path; and
- the temporary QA channel and QA-only objects were removed.

No retry was performed. Full evidence and the remaining boundary are recorded
in `staging-acceptance-2026-09-20.md`.

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

The staging proof used small harmless files and did not establish a production
file-size entitlement. A production plan must explicitly support the chosen
limit; otherwise the application remains fail-closed above 3.5 MB.

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

Until those answers are reviewed and accepted, the staging-only key may be used
only for separately authorized synthetic staging proof. It must never receive a
real IEP or other user file.

## Remaining gates

Completed for synthetic staging:

- the staging-only replacement key is stored as
  `STAGING_CLOUDMERSIVE_API_KEY` in the protected GitHub `staging` environment;
- the reviewed adapter is merged and deployed at exact SHA;
- one protected channel-attachment clean/EICAR proof passed without retry; and
- the clean-only download, infected-object purge, and sanitized-audit contracts
  were proven live.

Still required:

1. Review Cloudmersive DPA, subprocessors, region, retention/deletion terms,
   security posture, and education-data suitability; obtain and accept the
   written answers listed above.
2. Record the production plan, supported file size, rate limit, service level,
   incident commitment, and approved region.
3. Add equivalent protected synthetic live proof for the `student-documents`
   upload path. It shares the reviewed adapter, but only the
   `channel-attachments` path was exercised in run `35521640583`.
4. Obtain separate authorization before any production secret, deployment,
   migration, or real student/IEP file is involved.

## Official references

- https://api.cloudmersive.com/docs/virus.asp
- https://www.cloudmersive.com/virus-api
- https://portal.cloudmersive.com/selectplan
- https://cloudmersive.com/security
