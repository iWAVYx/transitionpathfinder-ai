# Demo Feature Connection Checklist

This document is the human-readable view of `src/lib/demo/feature-map.ts`. It
exists so anyone editing `/demo/*` can confirm every visible element on the
public demo connects to a real TransitionForward product feature, route, role,
and data source — or is explicitly labeled as future-phase.

The live rendered version is at `/demo/connection` (internal audit page; not
linked from marketing nav and tagged `noindex`).

## How to use

1. Adding a new demo surface? Add an entry to `DEMO_FEATURE_MAP` first.
2. Drop `<FeatureFootnote elementId="..."/>` under the panel in the demo route.
3. The vitest case `tests/unit/demo-feature-map.test.ts` keeps statuses honest.

## Status legend

| Status         | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| live           | Feature exists in the signed-in product today.                |
| partial        | Feature exists; some demo surfaces still expanding.           |
| future-phase   | Planned. Demo shows the intent, signed-in product is not done yet. |

## Safety invariants the demo must preserve

- Partners never see private student data — only matched interest.
- District admins see aggregates by default, not raw IEPs.
- School admins do not automatically see every private document.
- AI summaries are planning aids; they never replace official IEP / PPT /
  CT-SEDS records.
- Joining the waitlist does not grant immediate account access.
- All sample data is fictional (Jordan Rivera). No real student records.

See `/demo/connection` for the full element-by-element table.
