# Step 1: Cloud + Auth + Waitlist

Grounding the next slice of TransitionForward in real backend infrastructure so we can collect waitlist signups, authenticate parents, and prepare for the IEP upload pipeline next.

## What gets built

### 1. Enable Lovable Cloud
- Provisions Postgres, Auth, Storage, and server functions.
- No external accounts required from you.

### 2. Database schema (migration)
- `profiles` — one row per authenticated user (id, full_name, role, created_at). Auto-created via trigger on `auth.users` insert.
- `user_roles` — separate roles table (`parent`, `educator`, `admin`) using the secure `has_role()` pattern. Default new signups to `parent`.
- `waitlist` — public form submissions: id, email, full_name, role (parent/educator/administrator/other), state, student_grade_band (nullable), reason (nullable), source, created_at.
- All tables: RLS enabled + explicit GRANTs + policies (waitlist insert open to `anon`+`authenticated`; reads restricted to `admin`).

### 3. Authentication
- Email/password sign-up + sign-in on `/login` (replaces current ComingSoon).
- Google OAuth button (managed by Lovable Cloud).
- Session listener wired in root layout; redirect to `/dashboard` placeholder on success.
- Logout in `SiteHeader` when signed in; "Sign in" link when signed out.
- Auth pages use the Sky & Peach / Outfit + Figtree design system already in place.

### 4. Working waitlist form
- Replace `/waitlist` ComingSoon with a real bento-style form:
  - Email (required), full name, role select, state, optional grade band, optional "what brought you here" textarea.
  - Client validation with `zod` + `react-hook-form` + shadcn `Form`.
  - Submits via a `createServerFn` (`submitWaitlist`) that inserts into `waitlist` using the admin client after Zod re-validation server-side.
  - Success state shows a thank-you bento card with next steps; error state shows toast.
- Landing page "Join the waitlist" CTAs link here.

### 5. Dashboard placeholder (auth-gated)
- New `src/routes/_authenticated.tsx` layout that redirects unauthenticated users to `/login`.
- `src/routes/_authenticated/dashboard.tsx` — bento welcome card with "IEP upload coming next" so logged-in users land somewhere real.

## Technical details

- Supabase clients already present: `client.ts` (browser), `auth-middleware.ts` (server fn auth), `client.server.ts` (admin). Reuse all three.
- `src/start.ts` — verify `attachSupabaseAuth` is registered in `functionMiddleware`; add if missing.
- Server fn `submitWaitlist` lives at `src/lib/waitlist.functions.ts`, no auth middleware (public form), uses `supabaseAdmin` after Zod validation with email format + length caps.
- Trigger function `handle_new_user()` (SECURITY DEFINER) creates a `profiles` row and assigns default `parent` role on `auth.users` insert.
- `useAuth()` hook in `src/hooks/use-auth.ts` exposes `{ user, session, loading, signOut }` via `onAuthStateChange`.

## Files to create / edit

- migration: profiles, user_roles, app_role enum, has_role(), waitlist, trigger, GRANTs, RLS
- `src/hooks/use-auth.ts`
- `src/lib/waitlist.functions.ts`
- `src/routes/login.tsx` (replace placeholder — tabs for Sign in / Sign up + Google)
- `src/routes/waitlist.tsx` (replace placeholder — real form)
- `src/routes/_authenticated.tsx` (layout guard)
- `src/routes/_authenticated/dashboard.tsx`
- `src/components/site/SiteHeader.tsx` (auth-aware nav)
- `src/start.ts` (verify middleware)

## Out of scope this round

- IEP upload + AI extraction (next slice).
- Parent dashboard widgets beyond the welcome card.
- Email notifications on waitlist submission.
- Admin view of waitlist entries (DB is ready; UI later).