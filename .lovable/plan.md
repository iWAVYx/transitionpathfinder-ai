# Hosted Build Container Escalation — lovable/preview-611789b1

## Summary

Escalating the hosted **preview build container** for this project is not an
action available through any Lovable tool or CLI verb (the only build command is
`lovable build diagnostics <sha>`; `resize_compute` covers the Lovable Cloud
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
- Candidate commit SHA: 0ee3ceabfd98783b4d20924a818b136b4479f67b
  ("Emit Lovable preview document manifest", 2026-09-02 00:58:10 -0400)

Direct evidence:
- Repeated hosted preview builds across many recent main commits
  (e7f8406d, 9bb07358, a74dc618, 39d7b88e, 1f800a2d, c793e4ae, 10c1b823,
  611789b1, 1a3e0112) all ended "Build unsuccessful" with empty diagnostics
  and empty failed_targets — the signature of a container-level termination
  before structured compiler output could be written.
- A clean GitHub-hosted Node 22 / Linux job for an earlier candidate on this
  branch passed BOTH the Lovable-shaped preview build and the separate full
  production SSR build; the Lovable UI identified a 4 GB out-of-memory kill.

Conclusion: the code builds successfully given adequate memory; only the
hosted container's 4 GB ceiling is blocking the preview build.

Requested outcome:
- A larger hosted preview build container (or an equivalent per-project memory
  override) so a single preview build of
  0ee3ceabfd98783b4d20924a818b136b4479f67b can complete.
- No retry is requested until the larger container is confirmed active.
```

## Next support path

1. Submit the request text above through Lovable support
   (in-app support chat or support@lovable.dev) — no automated channel exists.
2. After support confirms the larger container is active, trigger one preview
   build (Update preview / Rebuild in the Lovable UI) for the candidate SHA.

## What happens after approval of this plan

1. Deliver the escalation request text above for the user to submit through
   Lovable support.
2. Stop. No builds are triggered, retried, published, or deployed; no files,
   commits, branches, configuration, secrets, or infrastructure are modified.

## Explicitly out of scope

- Any code or file edits.
- Any hosted build attempt — none will be consumed.
- Any change to GitHub, Cloudflare, Stripe, databases, auth, or domains.
