# Hosted Build Container Escalation — lovable/preview-611789b1

## Summary

Escalating the hosted **preview build container** for this project is not an
action available through any Lovable tool or CLI verb (the only build command is
`lovable build diagnostics <sha>`, and `resize_compute` covers the Lovable Cloud
database instance, not the build container). Per the instruction, the exact
infrastructure escalation request is prepared below and nothing is changed.

## Escalation request (ready to send to Lovable support)

```text
Subject: Request — larger hosted preview build container for one project

Project: Transition Pathways Hub
Project ID: a4a5068b-10df-4e31-8d22-73186657d452
Preview URL: https://id-preview--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app

Request:
Please raise the hosted preview build container memory limit (currently 4 GB)
for this project only, so the isolated branch build below can complete.

Scope of the escalation:
- Project: a4a5068b-10df-4e31-8d22-73186657d452 only
- Branch: lovable/preview-611789b1 (isolated)
- Candidate commit SHA: 1a3e01127eee6e53f8b25dcbc82f2dbb3de2f6a5

Direct evidence:
- A clean GitHub-hosted Node 22 / Linux job for this exact commit passed BOTH:
  1. the Lovable-shaped preview build (sandbox variables set), and
  2. the separate full production SSR build.
- Lovable's automatic connected preview card for the same commit still ended
  "Build unsuccessful"; the UI identifies a 4 GB out-of-memory kill.
- Hosted diagnostics for the failed run return empty diagnostics and empty
  failed_targets — consistent with a container-level OOM termination before
  structured compiler output could be written.

Conclusion: the code builds successfully given adequate memory; only the
hosted container's 4 GB ceiling is blocking the preview build.

Requested outcome:
- A larger hosted preview build container (or an equivalent per-project memory
  override) so a single preview build of
  1a3e01127eee6e53f8b25dcbc82f2dbb3de2f6a5 can complete.
- No retry is requested until the larger container is confirmed active.
```

## What happens after approval of this plan

1. Deliver the escalation request text above for the user to submit through
   Lovable support (no automated channel exists).
2. Stop. No builds are triggered, retried, published, or deployed; no files,
   commits, branches, configuration, secrets, or infrastructure are modified.

## Explicitly out of scope

- Any code or file edits (the SPA-mode and memory-cap work remains local).
- Any hosted build attempt — none will be consumed.
- Any change to GitHub, Cloudflare, Stripe, databases, auth, or domains.
