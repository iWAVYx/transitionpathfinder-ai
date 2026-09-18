# Cloudmersive malware-provider substitution — 2026-09-18

## Status

**DRAFT / CREDENTIAL-FREE / NOT DEPLOYED / NOT LIVE-TESTED**

Production remains **NO-GO**. This package does not create an account or API
key, change a secret, call an antivirus service, upload a file, deploy staging,
publish Lovable, change a database, or touch production.

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

## Remaining gates

1. Review Cloudmersive DPA, subprocessors, region, retention/deletion terms,
   security posture, and education-data suitability.
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
