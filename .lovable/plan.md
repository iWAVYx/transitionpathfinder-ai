# Platform Page: A Real Product Showcase

Right now `/platform` is a static grid of nine feature cards. It tells visitors what exists, but it doesn't *show* the product or let them feel how it works for the four people who actually use it. The redesign turns the page into a guided tour through the platform from every perspective.

## Goals

1. Prove the product is real and usable, not just a pitch deck.
2. Let visitors see the actual UI from the Family, Student, Educator, and Admin point of view.
3. Connect each tool to a concrete moment in the transition planning journey.

## Page Structure

```text
1. Hero            "One Platform. Four Perspectives."
2. Perspective     Tabbed switcher: Family | Student | Educator | Admin
   Switcher        Each tab shows: who they are, the 3-4 tools they live in,
                   an annotated UI preview, and a "Day in the life" mini story.
3. Signature        AI Pathway Builder walkthrough: intake -> report -> share
   Feature Deep     with a real sample report rendered inline (read-only).
   Dive
4. Tool Library    The existing 9-card grid kept, but each card now tags which
                   perspectives use it and links into the relevant tab above.
5. How It Fits     A three-layer diagram (Organize / Generate / Connect) with
   Together        labeled flows between tools.
6. Trust Strip     Privacy, FERPA awareness, Connecticut focus, founder note.
7. Dual CTA        Create a Pathway Report  |  Join the Waitlist
```

## Perspective Tab Contents

Each of the four tabs follows the same shape so they feel like one product seen from four chairs:

- **Header line** - who this is for, written in their voice.
- **"What you'll do here"** - 3-4 bullets tied to actual routes (Dashboard, Pathway, Students, Reports, PPT Prep, Goals, Settings).
- **Annotated UI preview** - a styled mock panel showing the real interface elements (header chips, cards, progress bars, invite inbox) rendered with the same design tokens as the app. Not screenshots; small live-feel components built with existing UI primitives so they always match the app.
- **One short scenario** - 2-3 sentences in plain language: "Maria opens her dashboard Sunday night..."

### Family
Tools: Pathway Report, Family Voice, PPT Prep, Resource Match. Preview: dashboard card stack with an invite from a teacher and a Pathway Report summary.

### Student
Tools: Student Voice Profile, Pathway Report (their copy), Goals view, Resource Match. Preview: Student Voice panel with strengths chips and a "what I want after high school" note.

### Educator
Tools: Educator Dashboard, Goals Editor, Pathway Progress tracker, Collaborators, PPT Prep. Preview: roster row with progress bars and a goals editor snippet.

### Admin
Tools: Admin console, Waitlist management, User roles, Usage overview. Preview: admin table strip with role chips and a waitlist count tile.

## Signature Feature Deep Dive

A three-step horizontal flow:

1. **Intake** - thumbnail of the intake form fields (strengths, interests, voices).
2. **Generate** - the AI step shown as a small animated indicator with the model name and what it considers.
3. **Report** - an inline, read-only render of a real `PathwayReport` shape (summary, strengths snapshot, one career pathway, 30-day plan) using the same components the live `ReportView` uses, with sample data.

A "Try it now" button anchors to `/login` and a "See a sample report" button reveals more sections inline.

## Technical Notes

- New file: `src/components/platform/PerspectiveTabs.tsx` - tabbed switcher built on `@/components/ui/tabs`.
- New file: `src/components/platform/PerspectivePreview.tsx` - reusable annotated UI preview shell (frame + dots + label + slot for content).
- New file: `src/components/platform/SampleReport.tsx` - sample `PathwayReport` data plus a trimmed renderer. Reuses styling from `src/components/pathway/ReportView.tsx` so it stays in sync with the real product.
- New file: `src/components/platform/LayerDiagram.tsx` - three-layer SVG/CSS diagram for the "How it fits together" section.
- Edit: `src/routes/platform.tsx` - replace current single grid with hero + tabs + deep dive + grid (kept, with perspective tags) + diagram + trust + CTA. Keep `head()` meta updated.
- No backend changes. No new routes. No new dependencies.
- Title Case throughout, no en dashes (matches the recent content pass).
- All colors via semantic tokens already defined in `src/styles.css`. Existing hero image `platform-hero-v2.jpg` is reused.

## Out of Scope

- No new generated images this pass; the perspective previews are built from UI components, not photos.
- No changes to the actual Family / Educator / etc. landing pages.
- No changes to auth, RLS, or server functions.

After you approve, I'll build the components and rewrite `src/routes/platform.tsx` in one pass, then verify the page renders and the tabs switch cleanly at the current 1021px viewport and on mobile.
