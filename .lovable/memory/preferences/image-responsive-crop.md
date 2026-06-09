---
name: Responsive image cropping
description: Always make added/changed images fill their container neatly across breakpoints via aspect-ratio + object-cover + focal point
type: preference
---
Whenever an image is added, changed, or edited:
1. Render it inside a fixed `aspect-[...]` wrapper with `overflow-hidden`.
2. Use `object-cover` + `h-full w-full` so it fills the section on every screen.
3. Set an `object-position` focal point that keeps the subject in frame as the crop tightens on narrow viewports (e.g. `"35% 45%"` for a person sitting on the left).
4. Provide responsive `srcSet` / `sizes` when a CDN variant is available.
5. Never rely on intrinsic dimensions to "just look right" — verify in preview at mobile + desktop.

**Why:** prevents subjects getting cropped out or letterboxed when the layout reflows.
**How to apply:** for `FeatureShot` and similar wrappers, pass `aspect` + `objectPosition`. For new components, follow the same wrapper+cover+position pattern.
