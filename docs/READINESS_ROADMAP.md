# TransitionForward — Readiness Roadmap

## Standing rule for every role change

For every feature, tool, workflow, navigation, content or layout change to any role, assess applicability across Student, Family/Guardian, Educator, School Admin, District Admin, Partner and Owner. Record which roles share the implementation, which need adapted behavior and which do not apply, with a reason. Prefer shared components and contracts for equivalent workflows; clearly distinguish demo sample data from signed-in records. Check role-specific destinations, empty/loading/error states, persistence, exports and responsive behavior where affected. Preserve permissions, privacy and Owner Hub management-only scope; sharing an implementation never grants another role access. Validate every affected role and note untested cases explicitly. Promote the same reviewed source through staging and separately authorized production releases with isolated environment configuration.

## PPT quality follow-up — October 5, 2026

PR210 is released to both isolated staging hosts with fingerprint a4ceab280b4686b913a96ff6ef63a470ca7ad603484ca42317b73aeac771efd1 / 1,066 files and passing external isolation. Protected run 37344887842 passed both Family and Educator technical cases using exactly two synthetic generations. Ownership, report linkage, saved reopening and opposite-account denial passed; cleanup included a zero-row check for generated packets.

PDF/content review leaves polished export and speaker accuracy open. The local follow-up scopes printing to packet content, avoids splitting list items and orphaned headings, hides fully empty partner setup in print and clarifies that Family/Educator labels identify speakers. This implementation applies to every existing authorized PPT consumer through the shared route/generator; Student, Partner and administrative/Owner roles receive no additional access. TypeScript and 13 focused tests passed. Browser visual checks and another separately authorized AI check remain pending; production unchanged.

## Current release status — October 5, 2026

- Cross-role follow-up: assess changes to any role for relevant equivalents across all roles while preserving authorization and Owner management-only scope. PPT follow-up corrects family-only copy/action categories, accessible labels and printable controls; live quality/persistence/export checks remain open.
- Dashboard widget follow-up (unreleased): shared demo/live view adds purpose, honest empty-state expectations and role-specific action guidance across six dashboard roles. Owner remains management-only. Demo and live share presentation/interaction contracts with clearly labeled sample data; production promotes the reviewed staging source with separate configuration.
- PR207 merged as cca6afee56f3ec996f2f247d34fcdd1c9f40424d after explicit authorization. Both isolated staging hosts externally verify fingerprint c9d5ed4b05ba9ef91e04aac619f6120e646e064f050227b2c029e19cd72ce95f, 1,065 files, staging backend, sandbox payments and isolation.ok true. Cloudflare run 37268438803 succeeded; the existing Lovable staging website update completed. Production was not touched.
- Seven-role signed-in access/navigation audit 37163132863 passed. Dashboard regression 37163132862 passed all 84 browser checks with seven role sign-ins. These checks make no AI calls and do not establish generation acceptance.
- PPT prep content follow-up requests a substantive 600-900-word packet with student voice, measurable progress questions, decision-linked evidence, Family/Educator scripts and documented next steps. Missing evidence must be identified, not invented; the report is not treated as a verified IEP. Prompt boundary tests pass; live output quality still requires acceptance.
- Generation follow-up is local and unreleased: structured generators explicitly transmit their JSON schemas and validate returned objects. PPT prep now reports persistence failure instead of returning an unsaved success. Thirty focused tests and TypeScript pass locally using the bundled Node runtime.
- Role/output acceptance remains explicit: Family and Educator need Pathway creation/regeneration, PPT prep, document/IEP extraction, evidence and next-step outputs verified live. Student needs permitted report, forms, goals and export workflows; Partner needs profile/opportunity management; School and District administrators need organization/readiness/export workflows; Owner needs management and its diagnostic generator. Role restrictions must remain intact; private planning tools are not added to roles that do not permit them.
- Initial Family Pathway generation, saved report linkage and rendering passed in run 37135760600 before the nested-route failure fixed by PR207. Subsequent Student/Educator/Partner checks were skipped. This is not all-role live acceptance. New generator changes still require review and authorized staging release before live validation.
- All earlier roadmap items remain tracked below, including deferred parent pilot and Pathway Report snapshot work. No outreach, production release or migration is authorized by this update.

## October 3 — verified PR206 release and complete parent-route audit

- PR206 merged as 6a48e241a8e7076feb30615ccd4509e105fbb0d0 with user approval.
  Cloudflare staging run 37135158997 succeeded; isolated Lovable sync, frozen
  install, build and existing staging publication update succeeded. Both external
  hosts verify c249a3898d02c0075814d29bc1575c4b5b87128819f17d9367ccb5b940cd5f62,
  1,064 files, staging backend, sandbox Stripe and isolation.ok true. Post-merge
  build, report accessibility and credential-free readiness audit passed.
- One newly authorized synthetic run 37135760600 FAILED later at /pathway/family.
  Report rendering and all persisted intake/report linkage, summary and model
  assertions passed. The builder parent masks its family child route. Student,
  Educator and Partner report checks were skipped. Cleanup hook reported no
  failure; credential removal and sanitized artifact upload succeeded. No
  independent remaining-row audit or additional generation was performed.
- Complete generated parent-page inventory found seven more missing outlets:
  Pathway (family/student), Documents (review), Forms (detail), Meetings (detail),
  legacy Admin (org management), Blog (article), PartnerForward (incentives).
  Candidate shared RoutePageOutlet preserves landing pages and existing
  beforeLoad/child guards. Thirteen real-router/inventory regressions and five
  role/access contracts passed locally. Staging release is not yet authorized.
- Full signed-in role/data acceptance remains open. All original requirements
  remain tracked; parent pilot/report snapshot stay deferred. Production untouched.

## October 3 — stable staging and live report routing acceptance

- PR205 merged as d970ba66d803c0bce9fe39a6e43182d2f5162033 with explicit user
  authorization. Cloudflare staging run 37129711915 succeeded; the isolated
  Lovable project was synchronized, built and published only at
  https://gentle-forward-reach.lovable.app. Both external hosts verified
  fingerprint eac8cbc0a821b0742f4477a5dfca15e26e5dcd3cae7360261fbb002e1f32ab29,
  1,064 files, staging backend, sandbox Stripe and isolation.ok true.
- Single authorized synthetic workflow 37130817534 FAILED after generating a
  saved report: its detail URL renders the library because the parent route
  does not render its child outlet. The artifact shows the new synthetic report
  and summary. All four sign-ins and both identity gates passed. Student,
  Educator and Partner report checks were skipped, not passed.
- The test database cleanup hook reported no failure; credential removal and
  sanitized artifact upload succeeded. No independent remaining-row audit was
  performed. One AI retry is consumed; no duplicate generation was requested.
- Candidate fix renders the shared child outlet for individual reports while
  retaining the existing detail role guard and library behavior. Actual-router
  regressions cover direct opening and library → detail → Back navigation.
  Staging release and another AI generation require explicit authorization.
- Production remains untouched. Full signed-in acceptance for every role and
  the older note register remain open; parent pilot/report snapshot stay deferred.

## October 3 — cross-role navigation and PR203 release

- User authorized PR203 merge, both staging updates and one synthetic retry.
  Merged commit `4031379624e5c7637caf5f6944eef67f03fb8cf4`; Cloudflare staging
  run 37124901954 succeeded. External health verifies fingerprint
  `c9377aaba2bc5e702c8b7916e7787c04b0a66e5430caa89cf1f803be5e54ca82`,
  1,064 files, staging backend and sandbox Stripe, isolation.ok true.
  Lovable exact sync, frozen install and build passed. Supported editor
  Shift+Refresh and existing runtime restart were attempted. External health
  still serves PR202 (73baaf47…421620), despite current workspace source.
  External activation remains unresolved; the authorized retry is unused.
  No new AI request until both external identities match; no support request.
- Scope explicitly includes every role dashboard, Tools menu and tool return
  navigation: student, family, educator/case manager, school administrator,
  district administrator and partner. Owner Hub stays website management only.
  65 focused checks passed across nine suites: published demo/live dashboard
  alignment, all six role menu destinations against actual dashboard actions,
  role authorization and route existence, shared calendar period navigation,
  owner/multi-role returns and unavailable role lookups. These are code/component
  checks; live signed-in acceptance for non-family roles remains open.
- Found and fixed locally: SiteHeader previously resolved ordinary roles before
  owner identity, briefly exposing the wrong planning workspace to mixed-role
  owners. Header now waits for both lookups, clears old role state on account
  change, and uses the guarded entry if owner lookup fails. Eight component
  checks pass, including delayed owner resolution and all six planning roles.
  This follow-up is draft PR204 (https://github.com/iWAVYx/transitionpathfinder-ai/pull/204), separate from deployed PR203; awaits review/release authorization.
- Existing shared router restores positions by full location href, covering role
  pages and tool navigation. Family browser checks were already recorded below;
  do not equate them with all-role live acceptance. Preserve every older roadmap
  item, including deferred parent pilot and Pathway Report snapshot work.

## October 3 — stable isolated staging deployment candidate

- PR204 merged/deployed on Cloudflare: c4f921fee911fd0c39e448df2679f95050c65474,
  runtime 8c8f49e9…419b273 /1,064 files, isolation passing. Lovable sync and
  build match; shared preview aliases still serve PR199/PR202 after refresh.
- User approved creating a new seven-day preview link with comments disabled.
  Link https://lovable.dev/preview/Ls0AwI1cYxFobrUWXsRG2FdHMgszPxTa resolves
  to id-preview, whose existing authenticated health still serves PR199.
  This did not activate the current source. No AI retry used.
- Read-only Publish panel shows this isolated project is Not published, selected
  address gentle-forward-reach.lovable.app, visible to anyone with the link,
  and No security issues found. Production domains/backend are separate.
  Candidate targets only this exact stable staging hostname and aligns live-QA
  workflow/test gates. Stale preview aliases remain rejected; backend identity,
  sandbox Stripe, source fingerprint and production-secret gates remain enforced.
  Publishing this isolated staging project is NOT yet authorized. Release review,
  exact archive sync and explicit staging-only publish approval must precede it.
  Protected live-QA workflow base URL must be updated to the exact stable staging origin
  under that release authorization; then verify both runtime fingerprints and
  isolation before the already authorized single synthetic retry.

## September 30 — demo parity and authorized staging release

### Immediate dependency: isolated Lovable AI staging

- PR202 is merged as `9dcd4db40feb35a6f18199d339e40386de007566` and Cloudflare
  staging run 37072227116 succeeded. External health on both hosts confirms
  fingerprint `73baaf47991c51cd6d3f681fcf5088a76a74df2725b6a3394a2348c734421620`
  / 1,064 files, isolated staging backend and sandbox Stripe. Lovable managed
  AI is configured and isolation.ok true. User supplied fresh external health.
  Family browser acceptance verifies calendar Agenda Next/Today, dashboard
  returns and existing Documents/PPT Prep destinations; owner/partner database
  acceptance remains open.

- The one authorized synthetic generation after PR202 parity failed at
  2026-10-02 21:36:38 Eastern. Persistent UI error retains all answers; the
  saved-report library shows no report. Safe server diagnostics contain only
  finishReason `stop`, section `iep_translator`, validation code `too_small`.
  The log does not identify which nested bound failed. No second AI call made;
  possible persisted synthetic intake cleanup is unverified.
  Candidate fix aligns the IEP translation contract with available evidence:
  omit the optional section when no actual IEP goal is supplied, accept one
  supplied goal and zero documented services, keep array maximums and require
  nonblank goals/services/questions. Prompt distinguishes draft ideas from
  existing IEP content. Ten focused generation/diagnostic tests, TypeScript
  and whitespace checks pass. Live success is not yet proven; review, release
  and authorization for another synthetic generation remain pending.

- October 2 next review batch: calendar month navigation clamps month-end dates;
  agenda Previous/Next/Today follows the selected week. Tool return links use
  the shared role/owner resolver, including owners who also hold a family role.
  Partner draft editing covers listing details with caller RLS, draft status,
  and original-revision predicates; pending submissions can be withdrawn to
  draft without overwriting a concurrent approval. Failed workspace reads show
  retryable errors instead of empty/setup states. No schema change is required.
  Sixty-eight focused tests, 18 lifecycle/navigation contracts, TypeScript, and
  whitespace checks pass. Signed-in database save/review acceptance and full
  keyboard/mobile checks remain open; this batch is not merged or deployed.

- October 2 PR201 preview follow-through: reviewed release is on Cloudflare
  staging and synced in the isolated Lovable workspace. The external preview
  last showed PR200. Used the documented Shift+Refresh environment restart and
  confirmed Live preview is enabled. External health tab control times out;
  current fingerprint/isolation verification remains pending, as does the one
  authorized synthetic report test. Production is untouched.

- October 2 controlled PR #199 retry: hosted Lovable health confirmed the
  `21458248…fe4cf7` fingerprint, 1,062 files, managed AI and passing isolation.
  One authorized fictional Robin Staging retry failed at 03:11:19 Eastern;
  the persistent error rendered and answers remained. Server diagnostics show
  finishReason `stop`, `invalid_type`/`invalid_enum_value`, and mismatches across
  25 report sections. No additional retry submitted. Installed compatible
  provider defaults structured outputs off and sends `json_object` without
  the schema. Local fix now explicitly supplies the JSON Schema derived from
  ReportSchema as model instructions while preserving output validation, model,
  and gateway configuration. Six focused tests pass. This is a candidate fix,
  not a successful generation result; staging validation and intake cleanup
  remain outstanding.

- October 2 authorized diagnostics release: PR #199 merged as
  `9d81e868020f4899ff2395ca1d6cac1df0bfea5b`. Cloudflare staging deployment
  [36975448406](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36975448406)
  succeeded; external health verifies that exact SHA, sandbox Stripe,
  isolation.ok true, and runtime fingerprint
  `214582486469f3515cff4df40a4a458fca283a588b64308068c8b53f98fe4cf7`
  (1,062 files). Uploaded the matching archive to the isolated Lovable project
  and submitted the user-authorized sync/build instructions. Lovable reports
  exact fingerprint parity before/after sync, frozen install and build:dev,
  with environment files and backend preserved. External preview health opening
  failed with browser ERR_BLOCKED_BY_CLIENT; hosted parity remains unverified.
  The one authorized synthetic retry has not yet been submitted. Production
  remains untouched.

- October 2 diagnosis: read isolated Lovable Cloud server logs (two-day window).
  October 1 at 20:20:18 Eastern records `AI generation failed No object
  generated: response did not match schema.` The log gives no invalid-field
  details, so the specific schema violation remains unknown. Added LOCAL
  allowlisted diagnostics for report section, validation code and finish reason;
  no raw provider output, student values or validation messages are logged.
  Six focused tests pass, including privacy and circular-cause handling. Report
  validation remains strict. No new AI request, deployment, model change or
  database cleanup occurred. Next reviewed staging update should include these
  diagnostics and the persistent error UI before one controlled reproduction.

- Pathway failure follow-up (local, not deployed): generation errors now remain
  in an accessible inline alert with the existing answers preserved and a
  new-tab link to check saved reports before retrying. Previously the only
  feedback was a transient toast. Source inspection confirms intake insertion
  precedes AI generation. The connectivity smoke uses Gemini Flash while full
  report generation uses Gemini Pro with structured output; smoke success does
  not prove this separate generation path. No provider/model change or retry
  was made. Hosted server diagnostics are still required to identify the
  actual failure and any orphaned synthetic intake.

- October 1 evening manual Family Pathway acceptance: confirmed Pat's family
  workspace with Robin Staging on the AI-enabled Lovable preview. Builder
  offered only the parent/caregiver role and selected the authorized student.
  Completed all eight steps with explicitly fictional culinary/training goals,
  assistive technology, accommodations, transport, evidence caveats, and voices.
  Submitted ONE generation request. The busy state ended without navigating to
  a report; a separate signed-in `/reports` tab showed "No reports yet".
  Generation/persistence acceptance FAILED; exact server cause is not yet known.
  The completed form remains open for diagnosis. No retry, actual document
  upload, cross-role sharing, or production action performed. Database intake
  residue has not been verified; do not claim no records were saved merely
  because the report library is empty. Student/Educator/Partner checks remain
  pending. Browser logs showed hydration warnings but do not establish the
  cause of the generation failure.

- October 1 signed-in browser acceptance: agent access to the existing Lovable
  preview tab now works. Reloading the stale `/dashboard` tab redirected the
  current platform-admin account to `/owner`. Home-page Dashboard navigation
  and browser back/forward returned to Owner Hub. The signed-in `/calendar`
  rendered Month, Week, and Agenda; each view switched successfully, Next
  advanced October to November, Today restored October, and Back to Owner Hub
  navigated to `/owner`. These are owner-session checks, not proof of ordinary
  family access, mobile visual parity, or the four-role Pathway acceptance.
  Requested a browser handoff to the synthetic family account before creating
  any Pathway test records. No account roles or calendar events changed.

- Authorized release alignment: PR #198 merged to main at
  `008987c7d8579d58f0d6b84ecdad8e73313fa399`; merged source matches reviewed
  candidate exactly. Cloudflare staging deployment run 36933000013 succeeded
  after normal protected approval. Independent external health confirms exact
  merged SHA, fingerprint `a0627d5c86181e18d38d4b0e1e8a2a1cd52920dc543d53cda3f7e24c90511c3b`,
  1,061 files, isolated backend, sandbox Stripe and isolation.ok true. Cloudflare
  AI remains intentionally unconfigured; managed AI stays on Lovable. Matching
  Lovable sync is complete: the user's signed-in external health response
  confirms the same full fingerprint and 1,061 files, sandbox public/server
  Stripe, managed AI configured, and isolation.ok true. No production publish
  or migrations run.

- October 1 protected Pathway acceptance attempt:
  [run 36935831656](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36935831656).
  Configured the non-secret staging environment variable
  `STAGING_LOVABLE_AI_BASE_URL` to the approved private preview origin and
  approved the normal staging gate for the authorized synthetic test.
  Frozen install and Cloudflare exact-SHA/runtime-source identity passed.
  Lovable preflight returned HTTP 401 because the preview requires platform
  sign-in. The run stopped before application authentication, report
  generation, or database writes. Full Family/Student/Educator/Partner
  acceptance remains BLOCKED, not passed. Next: use a supported authenticated
  preview testing mechanism or perform the synthetic acceptance in an
  authorized signed-in browser; do not publish the preview or export personal
  session credentials to bypass this gate. Owner routing and calendar browser
  acceptance also remain pending. Earlier progress entries below are historical
  and are superseded by this release and acceptance status.

- GitHub alignment resumed: PR #198 is open/draft/mergeable; previous remote
  failures were the dependency audit and four obsolete report role-tab
  assertions. Updated only brace-expansion patch resolutions and undici's
  security pin; frozen Bun 1.3.3 install and high-severity audit pass. Updated
  accessibility assertions to the existing role toggle-button group and added
  keyboard activation/selection checks. TypeScript and 1,201 unit tests pass.
  Fresh browser CI is still required. These dependency changes supersede v6 as
  the final release candidate; do not claim deployed v5/v6 fingerprint parity
  with the current candidate. Stage the reviewed work in PR #198 without merge
  or deployment, then align both staging hosts after approval.

- Owner/calendar candidate v6 prepared: local full release build and diff check
  pass, following 1,201 unit tests and TypeScript. Archive comparison confirms
  only six runtime files differ from verified v5 (owner routing plus calendar).
  Fingerprint `1e96f50c62b5141cc01718f7fb5029fde7d4f64b34fa8d4a7d3e206648ade750`,
  1,061 files. No environment files, migrations or credentials included. Private
  staging sync/build instructions include owner direct-dashboard/refresh/home
  routing, ordinary family access and full calendar desktop/mobile checks.
  Hosted deployment and browser checks are not performed yet. This does not
  satisfy protected-main/cross-host report-acceptance prerequisites.

- Owner routing fix implemented locally: `/dashboard` previously checked only
  ordinary roles and let family/student roles override its admin redirect.
  New OwnerWorkspaceGate checks authoritative platform-admin status before any
  family dashboard mounts, routes owners/admins to `/owner`, and offers retry
  on lookup failure. The admin-role server function now propagates query errors
  instead of treating them as no admin membership. Ordinary admin audience also
  takes precedence over family in the legacy dashboard resolver. Three behavior
  regressions cover owner redirect/no family mount, normal family access and
  retry after error. Browser/sign-in verification and deployment remain pending;
  this local fix is not part of the verified Lovable v5 archive.

- Post-smoke acceptance preparation: full current local Vitest suite passed
  1,198 tests across 116 files. Reviewed the protected acceptance workflow:
  main-only, exact Cloudflare SHA and cross-host source parity are mandatory.
  These gates are not yet met by the separate Lovable v5 archive and current
  local calendar candidate. No live report generated. Read-only PR #198 status
  attempt timed out in automatic permission review (not a safety denial), so
  current remote review/check status is unverified. Next finish candidate review
  and source alignment before requesting any previously unauthorized merge or
  staging deployment; preserve all existing workflow gates.

- PASSED — owner-reported external staging synthetic AI smoke test:
  October 1, 2026 at 4:40:09 PM America/New_York; 1,113 ms latency,
  seven synthetic identifiers removed, no records saved. This verifies a
  successful real managed-provider response through the fixed-input redaction
  flow and owner UI. Full Pathway Report generation, evidence quality,
  persistence, role visibility and exports remain unverified by this probe.
  Next align the reviewed source across the acceptance targets and validate
  a fictional student/report workflow in staging. No production AI or payment
  transaction is implied by this result.

- Next-step owner synthetic AI probe reviewed: `/owner/health`, button
  "Run synthetic AI test". Authenticated platform_owner required; fixed
  fictional redacted input, Gemini 2.5 Flash, 20-second timeout, no database
  writes or user uploads. Live run remains NOT performed: browser access to
  the isolated preview was blocked, so owner execution is required. Capture
  the displayed pass/latency/redaction count or exact failure once; do not
  retry automatically or treat this probe as full report acceptance.

- RESOLVED — owner supplied external signed-in v5 health: approved hostname,
  both staging labels, isolated backend `qgrertkqbwanerqqemph`, public/server/
  overall Stripe modes `sandbox`, livemode false, managed AI configured, exact
  fingerprint `2d7a8285dd6e38bc6cac7aba8d3ef9c2f7b33d077e613018ce9d9878a7d1fec0`,
  1,060 files, and isolation.ok true with no errors. Commit remains honestly
  reported as `dev`; the explicitly approved exact-host fingerprint policy
  provides identity for this non-Git-connected preview. Stripe mode setup and
  external v5 identity readiness are complete. This is configuration evidence,
  not proof of working checkout, credential account pairing, AI generation or
  full release acceptance. Next scope the owner-only synthetic AI smoke test;
  protected cross-host acceptance still requires reviewed-source alignment.
  Production is unchanged; no transactions or AI calls performed in this check.

- Owner relayed v5 workspace health after payment setup: staging labels/backend,
  public and server Stripe test modes, exact v5 digest/1,060 files, and only a
  localhost-hostname failure. This is reported internal evidence, not external
  acceptance. External health navigation was blocked by the browser client;
  owner-signed-in external JSON remains required to confirm sandbox modes and
  isolation.ok on the approved hostname after the hosted rebuild. No checkout,
  credential validity/account-pairing test or AI request has been performed.

- Owner explicitly authorized sandbox Stripe linking/configuration and a
  staging-only source-fingerprint identity policy. Implemented the identity
  exception only for the exact isolated Lovable hostname, both staging labels,
  exact staging backend and valid computed fingerprint/schema/file count.
  Stripe and forbidden-secret checks remain mandatory; other staging hosts
  and production retain Git identity rules. Twenty staging identity checks
  pass. Prepared v5 archive from v4 plus only the two identity/health files,
  excluding newer calendar changes; expected fingerprint
  `2d7a8285dd6e38bc6cac7aba8d3ef9c2f7b33d077e613018ce9d9878a7d1fec0`.
  Browser auto-review denied opening the exact authorized Lovable project,
  citing broad-origin exposure. No workaround attempted. Stripe configuration
  remains unperformed; consolidated owner/Lovable handoff prepared. No keys
  retrieved, new connection established, publish, migration or AI request.

- Stop repeating the resolved preview activation investigation: owner supplied
  external v4 proof already. Later copied build-status replies do not reopen it.
  Stripe sandbox configuration and genuine hosted build metadata remain the
  distinct pending readiness questions; advance independent roadmap work.
- Calendar parity follow-up implemented locally: full DashboardCalendar now
  renders the same TransitionCalendar month/week/agenda surface as role demos.
  Real loading/mutations, organization and student scope, visibility selection,
  timezone-aware existing exports and event-management controls remain in the
  signed-in wrapper; compact dashboard calendars retain their compact grid.
  Shared calendar supports actual prep/deadline/team/personal kinds without
  disguising them as sample categories. Focused rendering/context tests pass.
  Browser visual comparison and signed-in end-to-end verification are pending;
  do not mark all-tool parity complete. This is newer local source than v4 and
  has not been deployed or included in the already verified v4 archive.

- Readiness configuration preflight prepared after external v4 confirmation:
  inspect authentic hosted-build commit metadata and this isolated project's
  existing sandbox Stripe connection before configuring anything. Code requires
  both sandbox public-token and server-credential proof; a public token alone
  cannot pass health. Do not assume workspace HEAD is the hosted build commit
  or substitute the GitHub SHA. Read-only instructions saved as
  `/private/tmp/transitionforward-staging-readiness-preflight.txt`; external
  settings access remains a user-assisted step. No new runtime source changes.

- External v4 activation CONFIRMED by the owner's pasted signed-in health
  response: exact fingerprint
  `6dfbe39fb72b798e35e5cb89002160e85673faec6cca0dd1ca28d4f569871a9d`,
  1,060 files, approved external hostname, both staging labels, isolated backend
  `qgrertkqbwanerqqemph`, and managed AI configured. Source synchronization and
  hosted-preview activation are complete for v4. Health still fails on TWO
  distinct items: Stripe mode unknown and git_commit_sha `dev`. Next resolve
  staging-only payment proof and authentic hosted build identity; never label
  the copied source with a fabricated GitHub commit. Fingerprint remains the
  authoritative cross-host code-parity evidence. Protected end-to-end acceptance
  also still requires alignment with the reviewed Cloudflare release. No AI
  request or production action was performed to obtain this evidence.

- Hosted build completion reported by Lovable: 2026-10-01 15:10:15 UTC,
  "build OK", no errors; no version/build identifier supplied. Earlier old
  health observations are not proof this completed build failed to activate.
  A new-tab external health check after this report was blocked by the browser
  client (`ERR_BLOCKED_BY_CLIENT`), so external v4 activation remains unverified.
  Next owner-signed-in fresh health response must confirm v4/1,060 files before
  escalating activation to Lovable support. Do not repeat builds/source sync
  solely because the agent browser cannot complete this check.

- v4 follow-up: Lovable reports a successful frozen install and build:dev with
  APP_ENV and LOVABLE_SANDBOX removed, unchanged v4 fingerprint/1,060 files,
  staging backend and no actual live Stripe token in the built output. The
  platform-hosted build was still expected to run after its reply. External
  browser reload during this check still displayed the old 1,028-file health
  response; a follow-up request with a fresh query was blocked by the browser
  client. Therefore external v4 activation remains unverified (including the
  possibility of a stale response); do not infer another source failure from
  this observation. Next obtain completion of the platform-hosted build and
  confirm external health shows `6dfbe39fb72b798e35e5cb89002160e85673faec6cca0dd1ca28d4f569871a9d`.

- October 1 hosted-preview root cause and v4 correction: Lovable reports its
  fixed hosted command is `build:dev`; manually building another script never
  activates that output externally. Added narrowly scoped build-time recovery
  of missing APP_ENV from an explicit staging VITE label and the exact isolated
  backend URL. Explicit APP_ENV is preserved, conflicting backend URLs fail,
  and production/payment guards remain intact. The development-mode full build
  passes with APP_ENV omitted and the existing Lovable workspace marker, using
  dummy credentials; TypeScript and 27 focused checks pass. Prepared v4 runtime
  archive and instructions. Hosted activation and frozen install remain to be
  verified by Lovable; external health and Stripe readiness remain open. No
  deployment, migration, AI call, secret change or production action performed.

- October 1 v3 remote report: owner relayed a successful frozen Bun install,
  unchanged 1,060-file v3 fingerprint before/after a successful 22.8-second
  `build:isolated-staging` build, and the correct staging backend. Internal
  health reports v3, managed AI configured, Stripe unknown and localhost
  rejected. A conflicting "Build unsuccessful" platform banner remains
  unexplained. Independent signed-in browser reload of the approved external
  health URL STILL returned `4283df949d630f0800e4d6f698d191251ed98782c33e697e5154083adc972fe0`,
  1,028 files and commit `dev`. External hostname and staging backend are
  correct. Therefore the internal successful build has not been verified on
  the external private preview; Stripe is not its only outstanding issue.
  Next diagnose private-preview serving/activation and the conflicting banner
  without publishing. Do not repeat source synchronization or modify guards
  solely to fix a routing/activation problem. No AI call or production action.

- October 1 local reconciliation: adopted the exported 2.23.1 build-package
  manifest/lock and generated staging types after reviewing the complete diff.
  Verified the package tarball against the official npm integrity value before
  installing that package locally. The new `build:isolated-staging` command
  explicitly supplies both staging labels and the Lovable build flag; ordinary
  production scripts and guards are unchanged. TypeScript and 26 focused
  build/source-identity checks pass, and a local full build with inert backend
  overrides succeeds. This does not prove a fresh Bun frozen install or a remote
  Lovable build. Replacement archive v3 has 1,060 files and fingerprint
  `95330a31a8e43f0036c69f9bd25a32fb96c35d30d24a3de3bbd56e4b7e74f29c`.
  Next perform a frozen install and explicit staging build in the isolated
  project, then verify external health. No merge, deployment, migration,
  production access or AI request was performed.

- Reviewed owner-provided `transitionforward-staging-build-failure_v2.zip`:
  `vite.config.ts` and `scripts/resolve-public-build-inputs.mjs` match the
  supplied archive byte-for-byte. The recorded failing command is
  `bun run build:dev`, with no explicit staging variable assignments recorded;
  the log demonstrates production-profile selection, but does not establish
  the inherited build environment. Bun is 1.3.3 and Node is v22.22.0.
  Package changes are limited to the Lovable config upgrade 2.21.0 -> 2.23.1,
  its registry/integrity metadata and additional optional router-generator peer.
  Generated types retain the channel-history tables and RPCs (reordered), add
  relationship metadata and removal helpers, change some nullability, and omit
  `email_queue_dispatch`. Thus the type diff is not merely formatting and does
  not justify a migration or blind replacement. The source does contain the
  staging-safe profile; build-time label delivery and the three managed-file
  differences remain separate issues. No imported source or dependency changes
  were applied during this review.

- Latest isolated-workspace report: frozen dependency installation failed;
  Lovable reportedly rewrites `@lovable.dev/vite-tanstack-config` from 2.21.0
  to 2.23.1 in `package.json` and `bun.lock`, and regenerates
  `src/integrations/supabase/types.ts` from its attached backend. Reported digest
  is `3bdb89fb3063a73101cc278104a1bf68767447c08fdc9e1fe369f945557dce13`
  across 1,060 files. These three actual files/diffs must be obtained and
  reviewed before deciding whether to adopt the platform dependency version or
  reconcile generated types. Local source and installed build config remain
  2.21.0. A generated-type difference may expose schema drift; do not overwrite
  reviewed types blindly or migrate to make a fingerprint match. Do not exclude
  these files from the digest or approve a new digest solely to bypass parity.
  No further remote build, preview refresh, dependency update or AI test has
  been verified. Next obtain a read-only export of the three files plus package
  manager versions, review differences locally, and test a reviewed candidate.

- Follow-up build diagnosis: Lovable reported the full build selected the
  production profile and automatic dependency installation changed `bun.lock`.
  The supplied archive already includes the isolated-staging profile; all 1,060
  archive files still match the local checkout and its fingerprint remains
  `ddee81697a0fccd79073a39cdc921fb98c779a0369bda8c10711f1ef2bfb743b`.
  Nineteen focused build-profile checks pass. A local full Vite build with
  `LOVABLE_SANDBOX=1 APP_ENV=staging VITE_APP_ENV=staging` succeeded using
  inert local backend overrides. This supports a build-process environment
  mismatch, not a need to require production labels or live keys. Next restore
  the archive lockfile in the isolated workspace, use a frozen dependency
  install, and supply both staging labels explicitly to its full-build command.
  Do not accept a changed digest or relabel production to force a pass.

- September 30 source-sync follow-up: the owner relayed Lovable's successful
  archive checksum and byte-for-byte workspace comparison: runtime fingerprint
  `ddee81697a0fccd79073a39cdc921fb98c779a0369bda8c10711f1ef2bfb743b`,
  1,060 files. Lovable reported a restarted development preview/home HTTP 200,
  not a completed full build; a restart log error remains uninvestigated.
  Independent browser refresh of the approved external preview health URL still
  returned the previous `4283df…72fe0` fingerprint, 1,028 files and commit `dev`.
  Its hostname is the correct allowed preview hostname, not localhost. Therefore
  workspace synchronization is reported complete but externally served source
  parity is NOT verified. Next resolve the private preview restart/build or
  routing discrepancy, then verify the full expected fingerprint externally.
  Stripe remains unknown. Lovable's own history commit must not be represented
  as the GitHub source commit; the runtime fingerprint proves code parity.
  No publishing, AI requests, secrets, migrations or production changes made.

- Configure/verify AI staging before claiming generated-report parity, not after
  the remaining roadmap. Cloudflare UI staging reporting AI unconfigured is not
  evidence that production AI is unavailable. The approved AI test target is the
  separate Lovable isolated-staging project pinned by pathway-live-staging-qa.yml.
- Do not copy production's managed AI credential into Cloudflare or GitHub.
  Synchronize the isolated Lovable project's runtime source, verify staging
  Supabase/sandbox payment identity, then run its owner-only synthetic AI smoke
  test and the existing exact-source Pathway staging workflow.
- Read-only health verification of the isolated preview returned Unauthorized.
  After owner sign-in, browser health verified managed AI is already configured
  (`ai_gateway_configured=true`, `ai_runtime=lovable-managed`), both environment
  labels are staging, and the database is `qgrertkqbwanerqqemph`.
  Current blockers: Stripe mode unknown; commit identity `dev`; runtime fingerprint
  `4283df949d630f0800e4d6f698d191251ed98782c33e697e5154083adc972fe0`
  across 1,028 files, different from the deployed Cloudflare release. Isolation
  remains false. No AI call, secret change, payment setup or production change
  was performed. Next: synchronize the reviewed runtime source, resolve exact
  build identity and staging-only payment configuration, then run synthetic AI
  acceptance. Do not disable the existing acceptance guards to skip these gaps.

- Post-release viewer parity: Pathway Builder's prepared-report links now open
  the actual ReportView with the matching Maya baseline, selected Family/Educator
  audience, demo mode, no student identifier and no save/regenerate callbacks.
  The notice distinguishes prepared content from edited answers. Browser verified
  rendering and return to the builder's saved eighth step. Other three-profile
  demo report views still use the older demo renderer and need reconciliation.
  No public generation endpoint is enabled; public abuse controls and configured
  AI runtime remain dependencies. This follow-up remains local.

- Post-release generation preparation: extracted the live intake schema, report
  schema and prompt into a shared contract, and the model call into a server-only
  content generator with no database writes. The authenticated handler retains
  authorization, entitlements and persistence. Provider output is explicitly
  validated rather than cast. Mocked-provider tests cover missing configuration,
  invalid input/output and preservation of richer builder context. No public AI
  endpoint or provider configuration was introduced; sample-only access controls
  and actual-provider validation remain open.

- Post-release report reuse prerequisite: shared ReportView demo mode now skips
  live student-voice requests, opportunity pipeline and student partner matching,
  plus server preference hydration. Live preference pushers disconnect on unmount
  and ignore subsequent unsynced changes, preventing a prior signed-in report's
  callback from receiving demo interactions. Lifecycle regression added;
  1,189 unit tests and TypeScript pass locally.
- Generation dependency confirmed in code: createPathwayReport requires the
  configured AI provider and writes authenticated intake/report records. It must
  not be called from the public demo. A separate sample-only generation boundary
  and configured staging AI runtime remain required for actual engine parity.

- Post-release input handoff: submitting the demo builder now renders an
  input-based planning draft in the real report's shared stage body. Submitted
  voice, goals, supports, family/educator input and reported evidence populate
  their sections; omitted fields remain explicitly missing. Removed the duplicate
  input-summary list. Browser verified the fictional Maya draft after eight steps.
  1,188 unit tests pass, including changed-input and markup-escaping coverage.
  This is local, deterministic input organization, not readiness assessment,
  verified evidence or live engine recommendations. Full generated-report parity
  remains open; the separately labeled prepared report is still available.

- Post-release local parity pass: extracted the real Pathway Builder's cover,
  hero image, heading, progress wording and form styling into shared presentation
  used by both builders. Demo retains sample labeling and a prepared-report link;
  live retains saved reports. Questions and role applicability remain shared.
  This follow-up is not included in deployed `96caed9f`. Input-to-generated-report
  parity remains open; presentation sharing does not close that requirement.

- Owner acceptance standard: any real-product feature represented in the demo
  must match its signed-in layout, role applicability, navigation, and workflow.
  Use shared components with clearly labeled sample data; simulated operations
  must not imply real saves, invitations, appointments, or completed work.
- This standard includes dashboards and Pathway Builder. Existing contextual
  previews are incremental progress, not proof of full signed-in/demo parity.
- Owner authorized publishing the current package to staging only, without
  production deployment, merges, or database migrations. Release commit:
  `96caed9f908a428dd7acbcc1189ef3157c2bcdd2` on PR #198.
- Initial deployment was blocked by the staging environment's main-only rule.
  Owner then authorized adding only `codex/dashboard-simplification` to the
  staging branch allowlist. Retry run: `36671024084` succeeded. The public health
  endpoint independently confirmed the exact SHA above, staging Supabase
  `qgrertkqbwanerqqemph`, sandbox payments and `isolation.ok=true`.
- Published browser smoke check: signed-in Family dashboard shows the simplified
  five-tool menu plus account links; demo Pathway Builder opens with only Family
  and Educator choices and eight shared steps. All-role dashboard regression
  `36671273602` passed: 1,186 unit tests, all seven role sign-ins and all 84
  dashboard checks across mobile/tablet/desktop. Broader parity acceptance remains
  open. The temporary branch exception was removed after verification; staging
  is back to main-only deployment eligibility with reviewer approval retained.
- Staging health still reports AI runtime unconfigured. This release does not
  constitute end-to-end AI generation/provider readiness or full roadmap delivery.

## September 29, 2026 — reconciled owner requirements

### Preserved follow-up: parent pilot and Pathway Report snapshot

Owner direction, September 29: retain **all prior parent pilot and Pathway Report
snapshot notes**, then discuss implementation **after the current roadmap is
finished**. This is a deferred workstream, not a removed requirement or an
authorization to implement, launch, or contact pilot participants now.

Before that discussion, reconcile the original conversations and any existing
pilot/snapshot artifacts into a source-linked checklist. The originating Windows
task is `019ff43e-e059-7893-a717-c8cbadab387e` (“TransitionForward”); its history was
unavailable when this Mac continuation began. Details not recovered from those
chats remain explicitly unverified; do not substitute assumptions or treat the
current demo report as satisfying the prior snapshot requirements. Keep this
follow-up separate from the current 26-item delivery sequence below.

### Priority requirement: signed-in Tools must match real dashboard features

Owner clarification, September 29: the signed-in dropdown still exposes tools
that do not belong to the dashboard or have a useful place on the site. Treat
this as an **open release acceptance requirement**, not closed by the earlier
local menu cleanup. The deployed menu has not been revalidated with this package.

**Every tool must either be incorporated into an existing, applicable dashboard
feature or discarded.** Do not create extra standalone tools or dashboard cards
just to justify old dropdown entries. A registered URL, permissive route guard,
or demo preview alone is not evidence that a tool is useful or complete.

Acceptance checklist for TF-21/TF-23, coordinated with TF-13:

- Inventory every desktop and mobile signed-in menu entry for Student, Family,
  Educator, School Admin, District Admin, Partner, and Owner; include role aliases,
  multiple roles, loading/unknown roles, and account switching.
- Record each entry's existing dashboard card or related action, exact destination,
  intended role, functional purpose, and retain/integrate/discard decision.
- Retain only role-relevant tools with an actual usable destination. Unsupported,
  duplicate, misleading, orphaned and placeholder entries must leave the menu.
- Incorporate useful functionality under the existing feature that owns it;
  discard the independent tool entry. Removing a shortcut does not prove its
  underlying workflow has been integrated or authorize deletion of user data.
- Verify opening the tool, meaningful populated/empty/error states, applicable
  actions, and return to the dashboard with context and position preserved.
- Desktop and mobile must use the same approved inventory. Multi-role accounts
  must not receive tools from roles they do not hold; verify how their dashboard
  and home link relate to the combined menu. Unknown/loading roles show no tools.
- Owner remains website management only. Settings and Help stay clearly separated
  as account/support navigation, not presented as planning tools.
- Close only after role-by-role signed-in staging evidence for the released commit;
  local source checks alone cannot close this requirement.

#### Menu audit progress and disposition

Local source audit now checks real dashboard CTA definitions and attached related
actions, route registration and role authorization. It no longer accepts a
matching demo fixture as proof of dashboard membership. All 34 planning-role
shortcuts and four Owner management shortcuts satisfy those source checks.
Functional signed-in acceptance and the integration decisions below remain open.

| Role | Existing dashboard homes for retained local menu entries |
| --- | --- |
| Family (5) | IEP & Documents; Meeting Prep; Calendar; Family Action Items; Transition Channel |
| Student (7) | Student Voice; My Pathway Report; My Next Actions; Meetings & Prep → Calendar; Resources For Me; Partner Network; Transition Channel |
| Educator (7) | Caseload Snapshot; Pathway Reports; Document Review; Meetings & Calendar → PPT Meeting Prep; Meetings & Calendar; Action Items; Transition Channel |
| School Admin (5) | Team / Staff Access; Report Completion; Support Needs; Implementation; Calendar |
| District Admin (5) | Connected Schools; School-by-School Progress; District Reports; Service Gaps; Implementation Progress |
| Partner (5) | Partner Profile; Opportunity Management; Application Windows; Partner Resources; Incentives & Support |
| Owner (4) | Owner Hub Site Content; Blog & News; Manage Users; Opportunities review |

| Older standalone entry | Decision / existing feature home |
| --- | --- |
| Teacher Portal | Discard dropdown entry; useful educator input belongs in Caseload Snapshot, Pending Educator Input or Readiness & Evidence Gaps. Audit remaining workflow overlap. |
| Goal Tracker | Incorporated as Goals & Progress within Connected Student / Readiness cards locally; discard separate catalog grouping. Progress depth remains TF-20. |
| Students, generic report/create links | Use the role's existing student/report card and Pathway Builder flow; discard ambiguous cross-role catalog shortcuts. |
| Meetings, Meeting Templates | Discard independent shortcuts; assess useful scheduling/templates within Meetings & Calendar / Meeting Prep. Do not claim templates have already been integrated. |
| Trust & Consent | Use the existing Family Sharing & Consent feature; discard ambiguous Trust shortcut. |
| Messages, Feed, Forms | Discard independent dropdown entries. Useful communication workflows must fit Transition Channel; assess any forms use before retaining it as a feature. TF-09 remains open. |
| Generic Opportunities | Use Partner Network for discovery and Partner Opportunity Management for publishing; discard the ambiguous standalone shortcut. Directory opportunity depth remains TF-08. |
| Generic Insights / Analytics | Discard planning-menu entries; useful role metrics belong in existing readiness/report/oversight features. Owner Hub Analytics remains legitimate website management. |
| BridgeForward generic shortcut | Discard from Tools; keep age-appropriate planning within Pathway Builder, reports, resources and Partner Network. TF-03 coverage remains open. |
| Demo Mode | Discard as a signed-in planning tool; public demo remains its own experience. |
| Partner Impact | Discard standalone shortcut; review any useful metrics within existing partner management features before claiming integration. |
| District People & Access | Remove the extra dropdown shortcut; staff/access actions remain contextual to existing school/implementation workflows and require acceptance. |

The local header also no longer fetches middle-school eligibility solely to
support the discarded generic BridgeForward menu entry. No program access rule,
authentication policy or stored data changed.

### At-a-glance implementation plan

| Category | Included notes | Current progress | Next concrete milestone |
| --- | --- | --- | --- |
| Dashboard, navigation and responsive sizing | TF-21, TF-23, TF-25, TF-26 | Earlier dashboard cleanup verified in isolated staging; follow-up package being validated locally | Check every role's actual tool links, navigation restoration, mobile sizing and no horizontal overflow |
| Pathway Builder and demo/product consistency | TF-01, TF-11, TF-13, TF-14, TF-24 | Shared live/demo eight-step form and replacement tour entry implemented locally | Validate allowed roles, sample isolation, report presentation and all audience promises |
| Partner Network, BridgeForward and PartnerForward | TF-02, TF-03, TF-04, TF-08 | Real directory wiring and expanded search local; outreach infrastructure exists | Finish opportunity/detail management and verified-source coverage; finalize outreach draft before sending |
| Resource library and assistive technology | TF-06 | Four sourced AT resources and topic filter added locally | Broader accessible resource coverage, simpler cards and functioning content/source links |
| Pathway Engine, IEP/PPT and progress evidence | TF-07, TF-10, TF-16, TF-18, TF-19, TF-20 | Structured engine, uploads, extraction, goals and progress foundations exist | Recommendation provenance, trusted-source support, role-specific scripts and CT-SEDS-aligned exports |
| Owner Hub operations | TF-05 | Existing management console; Owner Hub-only direction retained | Audit all management actions and editing/review workflows |
| Licensing and pricing | TF-12, TF-15 | Access/billing foundations and tests exist | Licensed-district access matrix plus current pricing comparison and proposal |
| Transition Channel | TF-09, TF-17, TF-22 | Conversation/history choice merged; other communication work planned | Live acceptance, communication feature assessment, conferencing provider/design |
| Production release | Existing checklist and blockers | **NO-GO** | Reconcile stale records, close provider/security/operations gates, then seek specific release authorizations |

Status meanings: **exists** = found in code; **local** = edited but not deployed;
**validated locally** = named checks passed; **staging verified** = recorded deployed
commit and acceptance evidence. No item is “done in production” based on local tests.
No percentages are used because code foundations and verified product behavior are
different milestones.

### Complete note register

This register preserves the owner's September 29 notes and supersedes conflicting
older product descriptions below. Existing code is a foundation, not evidence of
complete signed-in behavior or production acceptance. Statuses below refer to the
local repository unless a deployment is explicitly linked. No production work is
authorized by this register. The older Windows task could not be read because its
host was unavailable; notes visible in the current conversation are captured here.

| ID | Requirement and acceptance criteria | Evidence / current status | Remaining work |
| --- | --- | --- | --- |
| TF-01 | Call the intake **Pathway Builder**. Compact, accessible, organized, thorough onboarding; demo follows the real fields and sequence. | Live `/pathway` already has eight steps, authorized student linkage, AT/accommodation/evidence inputs. Local title/size alignment and shared live/demo form implemented; under validation. `docs/pathway-intake-report-depth-audit.md`. | Validate shared fields, sample-only edits and input review; finish terminology/mobile/keyboard checks. The prepared demo report is explicitly separate from edited sample inputs; dynamic report parity remains open. |
| TF-02 | Include after-school programs, enrichment, and extracurricular activities. | Local directory collection filters added; no new organizations claimed or inserted. | Source real providers and opportunities, verify eligibility, ages, region, accessibility, fees, transport and availability; make owner and partner editing support the same taxonomy. |
| TF-03 | Build BridgeForward and PartnerForward coverage across every pathway with realistic options. | Directory, matching, BridgeForward source management, opportunity management exist. Signed-in Partner Network was still using demo profiles. Local wiring now reuses the database directory. | Age-appropriate pathway/region/support coverage audit; identify gaps explicitly; maintain current listings and alternatives. Breadth means actual options, never manufactured availability or repeated filler. |
| TF-04 | Establish at least **25 verified partner relationships** and the outreach pipeline. | Owner `/owner/partner-outreach`, `partner_outreach_log`, follow-up dates and outcomes exist. Verified relationship count not established. | Research prospects, validate contacts, prepare tailored outreach, record contact/reply/consent/verification, and track follow-ups. Owner requested a draft for editing/finalization first. Sender/title/reply-to remain placeholders. No outreach sent. |
| TF-05 | Owner sign-in leads only to **Owner Hub**, for website management. Every function has a useful destination and editable data. | Management hub and role-aware navigation exist; dashboard simplification leaves Owner Hub unchanged. | Audit every owner action: resources, partners, opportunities, users/access, content, review, outreach, health. Verify create/edit/review/archive flows and remove redundant Dashboard navigation. Preserve owner MFA and authorization. |
| TF-06 | Clear, readable resource library with substantial assistive-technology support. Each resource opens useful content or a new tab. | Local library adds an AT topic and four source-linked resources (CT guidance, CT Tech Act, ASHA AAC, Bookshare); titles open sources and action links open a new tab. | Add sourced AAC, accessible reading, AT assessment/trials, implementation and funding resources; simplify cards/filters; support inline content where permitted and reliable source links otherwise. No inert buttons or unsupported embedded previews. |
| TF-07 | Strengthen proprietary Pathway Engine value and keep demo/marketing/live product aligned. | Structured input mapping, age-aware logic, adversarial tests, source and uncertainty fields exist. | Recommendation-level provenance, versioned reasoning/rules, feasibility checks, input-sensitivity evaluation, human review, document and progress evidence. Do not claim legal IP uniqueness from a code review. |
| TF-08 | Real signed-in Partner Network is a searchable directory, with viewable information for every eligible listing. Partners manage profiles and opportunities. | Local fix removes demo-only signed-in views and reuses authenticated browse with public-column projection. Directory searches name, services, region, audiences and pathways; expandable information. Partner profile/opportunity routes already exist. | Detailed opportunity browsing, verified source/review dates, pagination/coverage beyond backend row limits, partner editing journey and moderation tests. Private or unapproved rows remain access-controlled. |
| TF-09 | Adapt ParentSquare's useful communication patterns to Transition Channel. | Channels, membership, chat history choice, attachments, digest redaction exist. | Evaluate two-way translation, delivery/read states, message templates, scheduling, notification preferences and accessible conversations. Implement original workflows and copy, not proprietary assets. See primary sources below. |
| TF-10 | Evidence-based IEP decoding and practical PPT prep for families; goal, accommodation and progress support for educators. | Upload/extraction/review pipeline, PPT tool, goal and report features exist. | Link each suggested goal/support to reviewed document evidence, dates, current authoritative sources and uncertainty. Distinguish observations, source text and drafts; usable meeting packet and editable team-reviewed goals. |
| TF-11 | Revamp Workspace Tour and Read Pathway Report to concisely demonstrate how inputs change outputs. | Shared workspace stages and report samples exist; some tour content is static narrative. | Interactive shared-field sample, source-to-section navigation, contrasting input examples, actual report structure, practical next action per page, fewer repeated panels. |
| TF-12 | Competitive affordable pricing, especially budget-aware district/school licenses. | Tier configuration and billing foundations exist. | Current primary-source market research; comparable student/site/district pricing, minimums, implementation/support costs, accessibility and purchasing budget assumptions. Review proposed pricing before changing live products/prices. |
| TF-13 | Every audience-page feature is visible and usable in that role's workspace. | Family/Educator claim-to-tool mapping now checked locally; missing links added within existing cards and shared with demos. Family activity-history preview added with explicit archive limitation. | Validate signed-in actions and outputs; complete Partner and Student promises. Full assessment archive and unified communication export remain open. |
| TF-14 | Platform three-step demonstration: Pathway Builder → Pathway Report → Student Dashboard. | Local platform labels corrected; legacy demo URLs preserved. | Make all three demonstrate the actual product layout and content; align tour, report and signed-in routes, not just labels. |
| TF-15 | Licensing/access codes/invitations/district requests work. Waitlist only applies to families, educators and schools outside licensed districts; district access request is distinct. | Invitation/redemption/license RLS tests and workflows exist. | End-to-end matrix for licensed/unlicensed districts, matched/unmatched organization, roles, expiry/reuse/capacity and pending requests. Eligible district users must not be diverted into waitlist. Preserve individual accounts. |
| TF-16 | Document/IEP upload → privacy/scan → extraction → review → useful outputs. | Both upload malware paths proven in synthetic staging; structured extraction and report linkage exist. | Prove reviewed evidence flows into report, PPT prep, plain-language document help and regenerated previews. Production provider/privacy/configuration gates remain open. |
| TF-17 | Private-thread and group-thread video/conference calls. | No complete conferencing implementation verified. | Provider/privacy/cost selection, permission-bound call creation/join, participant removal, lobby/consent, accessibility/captions and retention policy. Do not expose private meeting links to removed members. |
| TF-18 | IEP/PPT guidance grounded in data, documentation, current policy/law and trusted practice; support both family and school perspectives. | Policy/document foundations exist; not a complete source-backed support system. | Versioned official-source library, claim-level citations and jurisdiction/date, editable evidence packets, parent concerns and school response documentation. Design for productive team decisions; do not promise fewer due-process cases or legal outcomes. |
| TF-19 | Prompts/scripts for difficult IEP/PPT requests for parents and educators. | Meeting-prep foundations exist. | Original, respectful scripts with concern → evidence → specific request → question → agreed next step; distinct family/educator lenses; sources and editable wording. |
| TF-20 | CT-SEDS-aligned progress journal/charts, sharable and printable/exportable. | `progress.functions.ts`, `PathwayProgress`, progress-over-time chart exist. | Audit goal/objective IDs, baseline, metric/unit, conditions/supports, trials/data, dates, collector, method, target, reporting frequency, narrative and evidence; role-scoped sharing and export. Verify against current CT guidance; no claim of direct CT-SEDS integration without supported interface and testing. |
| TF-21 | Earlier dashboard feedback: tools dropdown matches dashboard tools; relevant previews without Data source bubble; return navigation and position restoration; compact Student Dashboard and font; demo parity. | Earlier dashboard simplification verified in isolated staging in PR #198. Follow-up edits are local and under validation. | Test every role/destination, query/hash/back/forward restoration, mobile and keyboard behavior, live/demo widgets and relevant previews. |
| TF-22 | Remover chooses retained read-only chat history or no access. | PR #197 merged, including PR #193 conversation-start work. | Confirm signed-in staging acceptance and migration state. Production acceptance is separate. |
| TF-23 | Only applicable roles, perspectives and toggles appear on demo and signed-in tool pages. | Local builder offers Family/Educator demo choices and filters signed-in choices by account roles. Existing role guards unchanged. | Audit every remaining demo/tool selector and deep link; test role changes, unsupported persisted selections and denied routes. |
| TF-24 | Replace “Walk the Workspace Tour” with the Pathway Builder demo. | Local demo CTAs and legacy start entry now open the shared eight-step form. | Validate all entry points and clarify the prepared report preview; replace remaining contradictory tour copy. |
| TF-25 | Even, centered, balanced spacing; no horizontal scrolling on any device view. | Local min-width/media constraints and smaller landing-page padding; no grid rearrangement. | Browser checks at 320/390/768/1440 px, landscape, keyboard focus and enlarged text, covering public/demo/signed-in roles. Mark individual routes checked; do not infer all-device acceptance from CSS. |
| TF-26 | Slightly smaller site scale, leaner mobile landing-page bubbles and less excessive whitespace, preserving layouts/UI outside necessary sizing. | Local desktop root-size cap reduced from 19px to 16px; mobile minimum and accessibility size controls retained. Landing headings/cards/hero spacing reduced. | Visual review across roles and devices; retain readable input text and touch targets; adjust only sizing/spacing/overflow. |

### Earlier dashboard notes, individually tracked

| Note | Progress | Acceptance still needed |
| --- | --- | --- |
| Simplify More/Tools dropdown and use existing dashboard destinations | **Open priority acceptance gate**; stronger local inventory checks | Complete the retain/integrate/discard audit above and verify each role on desktop/mobile staging; no orphan or irrelevant tools |
| Tool previews should contain relevant information; remove Data source bubble | Local snapshot-based details and bubble removal | Review each role's previews and empty/error cases |
| Pathway Builder return to dashboard | Shared return navigation local | Signed-in browser return and saved position |
| PPT meeting prep return to dashboard | Shared return navigation local | Signed-in browser return and saved position |
| Every tool has return navigation | Earlier PR #191 merged; follow-up local | Full route and role sweep |
| Forward/back returns to the same page area | URL-keyed restoration and async-height retry local | Browser history, query/hash changes, saved scroll and interaction state |
| Student Hub condensed and relevant | Local tabs and grouped tools; labeled Student Dashboard | Verify document, goals, resources, team and report access without lost work |
| Smaller signed-in dashboard text | Local compact styles | Mobile/desktop readability and accessibility controls |
| Demo reflects real dashboards | Shared widget presentation local | Remaining role-card/content parity and demo destinations |
| All planning-role dashboards end at expanded widgets | PR #198 verified in isolated staging | Remaining role-specific hands-on checks; PR still draft |
| Owner Hub strictly website management | Preserved | Audit owner navigation/actions; no planning dashboard added |


### Local validation for the current implementation package

September 29 checks passed: TypeScript; 107 unit-test files / 1,163 tests;
9 role/return-navigation contracts; Vite client/server build and service-worker
generation; whitespace check. New behavior tests cover authenticated directory
loading, multi-field search, featured-versus-verified distinction, fetch failure
and retry, and demo builder role choices, back/forward answer preservation,
input review and exclusion of live upload UI.

Local browser checks (isolated localhost preview, database URLs overridden to an
inactive local address; no staging or production data used):

- Home `/`, demo index `/demo`, and platform `/platform`: document width equals
  viewport width at 320, 390, 768 and 1440 px. This verifies page overflow, not all
  content clipping, contrast, accessibility or every device.
- Demo builder `/demo/intake`: widths 320, 390, 768 and 1440 px checked; Family and
  Educator only. Fixed two-card grid spacing, the grade selector's accessible
  label, and misleading demo upload instructions.
- Builder step and fictional answers now persist within the browser tab's
  session. Invalid/unsupported-role drafts are ignored. Unit coverage includes
  leaving/remounting, invalid JSON, and unsupported role restoration.
- Browser Back from platform restored builder step 3, edited interests and the
  exact prior scroll position (1449.5 px at 320 px width). Same-route step Back
  also retained the edited first name. Full forward/query/hash/signed-in state
  restoration still needs its own acceptance pass.
- Visual review flagged the landing hero's dark text over its purple decorative
  shape for follow-up readability review under TF-26; no unrelated redesign was
  made during this validation pass.

#### Role/tool connection pass — local, September 29

- Rechecked GitHub: PR #193 and PR #198 remain open drafts. No PR state changed.
- All six planning-role Tools menus are checked against existing dashboard
  destinations and route permissions; multi-role entries deduplicate. District
  School Progress and Partner Resources replace menu entries absent from their
  dashboard cards. Owner menus remain website management only.
- Fixed the student empty-report link to `/pathway/student`. Removed Profile,
  Goals and Documents dashboard cards whose destinations reject the student
  role; removed unavailable document/meeting-prep cards from the student demo.
  **This is not completion of student access to those capabilities.** Track their
  intended own-record experience and audience-page promises under TF-13/TF-23;
  review UI, server and RLS boundaries together before implementing access.
  No authorization policy was loosened.
- Planning/report demo lenses now offer Student, Family and Educator only;
  unsupported stored partner/admin selections fall back to Student. All choices
  are keyboard-focusable buttons with pressed state. The builder remains limited
  to its own Family/Educator questions. Dashboard role navigation still offers
  the six separate role previews. The internal connection audit lost its inert
  role selector.
- School, district and partner demo actions open an existing feature for the
  same role instead of dashboard loops or student planning pages. Partner sample
  tasks describe program review, not private student matches. Widget calendar
  and meeting links open the role's own feature preview.
- Every secondary demo-feature action is checked against the generated route
  inventory and role policy. Corrected missing `/readiness` and
  `/pathway/educator` destinations, broad school/district/partner links, and
  student links to restricted PPT prep. Partner previews now list their actual
  program connections rather than implying private report/consent access.
- The demo index opens the actual sample report; platform step descriptions
  reflect the interactive builder and current student tools. The report gained
  a return link to the selected role's dashboard and lost a redundant panel
  advertising unavailable downloads/saved contributions. Legacy planning pages
  also return to the role dashboard, preserving the sample student.
- Browser evidence: Partner Dashboard → Submitted Programs → Partner Dashboard
  works locally at 320 px without document overflow. Opening the report after
  selecting Partner produces only the three supported lenses; switching to
  Family changes the report framing and return link, which successfully opens
  Family Dashboard. Report checked at 320 and 1280 px. This does not validate
  signed-in staging journeys or all demo deep links.
- Updated browser-test selectors for the accessible button group and the
  replacement builder entry. Those end-to-end suites were **not run** in this
  pass; local browser checks used the isolated preview only. TypeScript, all
  unit tests, nine navigation contracts, client/server build, service worker
  generation and changed-code lint pass.

#### Navigation state and audience-feature pass — local, September 29

- Planning demo URLs now retain role, sample student, other query parameters and
  hash. Unsupported stored roles fall back to a planning role. Older bookmarks
  are normalized without adding history entries; storage hydration is covered.
- Dedicated Family/Educator/Student previews use the selected sample student,
  and their dashboard return links retain that student. Fixed a hydration race
  that could replace Sam with Jordan. Partner Network sample links preserve
  student context and the family tile no longer hard-codes Jordan's name.
- Added related links within existing dashboard cards, also used by demos:

  | Audience promise | Dashboard entry | Current boundary |
  | --- | --- | --- |
  | Family plain-language plan | Pathway Report — Family View | Existing report tool; evidence/output review still pending |
  | Family voice/priorities | Connected Student → Family Priorities | Existing contribution workflow |
  | Family progress | Connected Student → Goals & Progress | Progress/export depth remains TF-20 |
  | Family resources | Recommended Resources → Browse Resource Library | Coverage remains TF-06 |
  | Family PPT preparation | Meeting Prep | Source-backed depth remains TF-10/18/19 |
  | Family history | IEP & Documents → Access & Activity History | Recorded activity only; full assessment archive remains open |
  | Educator student snapshot | Caseload | Signed-in acceptance pending |
  | Educator goals/progress | Readiness → Goals & Progress | Progress/export depth remains TF-20 |
  | Educator Pathway Builder | Pathway Reports → Start Pathway Builder | Existing eight-step builder |
  | Educator meeting prep | Meetings & Calendar → PPT Meeting Prep | Source-backed depth remains open |
  | Educator communication | Transition Channel and Case Notes | Unified communication export remains open |
  | Educator report/PDF | Pathway Reports | Export/output acceptance remains open |

- All 12 Family/Educator audience cards are checked against existing dashboard
  destinations by a contract test. No additional section was added below widgets.
  This is discoverability evidence, not completion of every promised workflow.
- New Family Access & Activity History demo is explicitly fictional, reflects the
  selected student, and describes the real event log without promising a complete
  assessment archive. Educator copy now says evidence-informed drafts and
  educator review instead of unsupported expert authorship.
- Browser evidence: Sam's Family Dashboard → Access & Activity History → Back
  restored **1477.5 px** at 320 px viewport width. Forward reopened Sam's preview
  at its saved 0 px. Report Family → Educator → Back → Forward restored the
  corresponding role and Sam. Activity preview has no document overflow at
  320/390 px; primary action shortened and allowed to wrap.
- Three router behavior tests cover role/student Back/Forward, query/hash
  preservation, unsupported stored roles and old-bookmark hydration. These do
  not establish browser hash-anchor scrolling on every route.
- Updated end-to-end assertions to accept canonical context URLs and directly
  request report audience lenses. Those suites were **not run** against staging.
- Current-pass source/test lint passes. A wider lint scan of all accumulated
  changed files still reports formatting and existing code issues; the earlier
  scoped lint result must not be read as a clean repository-wide lint run.

#### Published demo deep-link audit — local, September 29

- Audited every published demo primary action against registered routes and its
  signed-in role. Found two stale Student previews: Documents → `/documents` and
  Meeting Prep → `/ppt-prep`, both unavailable to the Student role.
- The demo registry now publishes only previews whose signed-in primary action
  is permitted for that role. Unsupported Student templates remain unpublished
  for future own-record design; they are not counted as working features.
- Old or invalid preview URLs show an unavailable message and a working return
  to the demo dashboards. Browser testing exposed missing loader data during
  hydration on a retired preview; the page now validates route parameters before
  mounting the feature content. Unknown and inherited-object identifiers are
  rejected as feature/role names.
- Isolated browser checks: both retired Student URLs display the unavailable
  state; keyboard and pointer activation of the recovery link reach `/demo`. The Family
  Documents preview still loads for Sam and retains its `/documents` action.
- No live authorization was broadened. Student document access and appropriate
  meeting participation remain open TF-13/TF-23 requirements, not discarded needs.
- The inventory snapshot now excludes those two published pages; regression tests
  cover their resolution, unsupported identifiers and all published primary links.
  Browser-test cases were updated; the staging suites have not been run.
- Remaining context issue found while reviewing rich preview modules: some still
  embed fixed sample content (including the report/profile panels) despite a
  different selected demo student. Reconcile those modules with the shared
  age-aware sample data before claiming complete demo/live parity.

#### Embedded preview relevance pass — local, September 29

- Family and Student dedicated Pathway Report previews now render the same
  age-aware sample report as `/demo/report`, using the URL-selected profile and
  the correct audience. The former fixed Grade 11 sample panel was removed.
- Family Connected Student uses its contextual profile rows; removed a partner
  candidate-fit panel that did not belong in a family profile preview.
- Partner Active Opportunities uses its plan-specific program rows; removed a
  student-match panel that incorrectly implied private student matching access.
- Family Documents keeps its contextual document preview; removed fixed Jordan
  IEP text and services that were being shown for other selected students.
  This does not implement document decoding or satisfy TF-10/16/18.
- Student Voice explicitly receives sample mode. Its deeper interactions and
  remaining embedded meeting-prep, action, school and district modules still need
  context/role review; this pass does not claim all rich modules are reconciled.
- Browser evidence: Sam's Family report shows Grade 7 / BridgeForward and Sam's
  school, interests and evidence. Connected Student shows Sam's Grade 7 profile.
  Partner opportunities shows program listings, not student candidate matches.
- Tools dropdown status remains **local implementation/source audit passed,
  signed-in staging acceptance open**. Layout is a short role-specific tool group
  followed by separate Account links; Owner is website management only. No
  deployment or signed-in menu visual acceptance occurred in this pass.

#### Meeting/action sample consistency — local, September 29

- Family Meeting Prep now receives explicit profile-based example questions:
  current goal evidence, support needs, student interests/voice and an agreed next
  step. The fictional meeting date matches the existing profile token. Removed
  fixed Jordan wording and unsupported adult-service eligibility claims from this
  dedicated preview; source-backed live PPT workflows remain TF-10/18/19.
- Family, Student and Educator action previews use the same sample report engine
  as the report, filtered to that perspective's assigned/shared responsibilities.
  They display the engine's actual timeframe and review horizon, without turning
  sample actions into saved tasks or agreed deadlines.
- Removed the fixed educator meeting timeline; existing contextual meeting rows
  remain. This does not complete all educator meeting-prep support.
- Twelve render/data checks cover three profiles and all three action audiences,
  wrong-profile names, assigned/shared filtering and fictional meeting dates.
- Isolated browser evidence: Sam's Student actions show high-school open houses
  and practice leading a meeting section; Family Meeting Prep references Sam's
  current goal and interests rather than Jordan's adult-planning scenario.
- Remaining embedded-preview audit includes Student Voice card internals,
  calendar context/actions, school/district aggregate modules and resource links.
  Signed-in Tools staging acceptance remains open; this work is local only.

#### Student Voice and calendar preview audit — local, September 29

- Dedicated Student Voice preview now renders the selected fictional profile's
  own prompts/responses. Removed the fixed five-card capture module from this
  public preview, including its irrelevant adult goals and live-tool sublinks.
  The real signed-in Student Voice tool and authorization are unchanged.
- Family/Student/Educator sample calendar events now use the selected profile;
  removed unrelated Daniel/college-tour examples. Event and pathway links stay
  within existing public demo pages and retain student/role context.
- Other role calendar links resolve only to a published preview for that role;
  unmatched destinations are non-clickable instead of sending visitors into a
  signed-in tool. School/district sample aggregate content remains under audit.
- Removed the public calendar's Add Event shortcut into `/meetings`. Clearly
  labeled illustrative dates, no scheduled invitations/live reminders, and
  prefixed exported calendar filenames with `demo`. No real calendar changed.
- Calendar summary rows/count now come from the same displayed events rather
  than a second contradictory fixed schedule.
- Isolated browser evidence: Sam's Voice preview shows her three responses; the
  Family calendar's report link opens Sam's Family report via keyboard navigation.
  Full pointer/mobile acceptance remains part of the pending browser sweep.
- Thirteen checks cover three profiles, three planning audiences, public links,
  selected-student context, and remaining-role link validity. Existing demo
  capture interaction depth and real calendar workflows are separate acceptance.

#### Organization preview consistency — local, September 29

- Removed duplicate fixed school/district compliance and evidence panels, fixed
  educator summaries, and the generic resource panel from public feature previews.
  Existing contextual rows and metrics remain; signed-in tools are unchanged.
- School/district preview headings identify the selected organization. Keyboard
  browser checks confirmed Northgate's report preview and Millbrook's district
  reports (268 complete, 108 in progress, 36 missing), without unrelated panels.
- Corrected fictional school report completion arithmetic: Riverbend 97/168 is
  58%; Northgate 71/94 is 76%. Removed three unsupported fixed-count next-step
  prompts. Regression coverage checks percentages and excluded duplicate panels.
- Validation: 107 unit files / 1,165 tests passed; TypeScript, scoped lint and
  whitespace checks passed. These are local checks, not staging acceptance.
- Follow-up: organization dashboard widgets now derive report counts, connection
  and staff onboarding status, and support focus from the selected profile.
  Removed unsupported fixed compliance/urgency prompts from these widgets.
  Local browser verified Millbrook shows 8/8 connected and 268/412 reports;
  five regression tests cover both school/district profiles and zero onboarding.
  Full unit suite: 108 files / 1,170 tests passed; scoped lint and TypeScript passed.
- Still open: remaining aggregate
  fixture arithmetic, organization selection during Back/Forward navigation,
  resource source links, and full pointer/mobile review. Signed-in Tools dropdown
  acceptance remains open until the local package is authorized for staging and
  checked across roles on desktop/mobile. Parent pilot/snapshot work stays deferred.

#### Organization history restoration — local, September 30

- School, district, and partner-plan demo selections now live in role-scoped URL
  parameters. Legacy links are pinned with history replacement before later
  selections; storage is an optional default rather than history's source of truth.
- Selection changes preserve other query parameters and the current hash without
  requesting a scroll reset. Blocked browser storage no longer breaks these stores.
- Browser verified District Back restores Millbrook and Forward restores Coastal.
  Four regression tests cover school/district/partner Back and Forward, query/hash
  preservation, and legacy-link pinning without unrelated selector parameters.
- Validation: 109 unit files / 1,174 tests, TypeScript and scoped lint passed.
  Exact scroll-position and asynchronous hash-anchor restoration across all tools,
  mobile/pointer review, and signed-in staging acceptance remain open.

#### Scroll restoration follow-up — local, September 30

- Existing bottom-of-page anchors now clamp to the reachable scroll range.
  Saved positions still wait for async page height and stop when users scroll.
- Demo feature dashboard-return links now retain school, district or partner-plan
  context, avoiding a different restoration key from the originating dashboard.
- Browser evidence: District widget → report → browser Back returned to 1318.5px;
  after fixing the return URL, the tool's Back to Dashboard link restored 1383.5px
  exactly in a separate run. Forward reopened the report with the selected district.
- Three regression tests cover bottom anchors, delayed page height, and user
  interruption. Full suite: 110 files / 1,177 tests; TypeScript and scoped lint pass.
- This is a targeted local desktop check. Other roles/tools, mobile, arbitrary
  filters/query combinations, and signed-in staging acceptance remain open.

#### Planning dashboard widgets — local, September 30

- Student/Family/Educator next-action widgets now use the selected profile's
  prepared report, filtered to the viewer's or shared responsibilities. Calendar
  and meeting summaries use the same illustrative events as their demo preview.
- Links preserve the sample student and relevant audience; Student has no meeting
  prep destination. Events are explicitly examples, not appointments/invitations.
- Local browser verified Sam's Family widgets and an action link to
  `/demo/report?role=family&student=sam`. Nine regression cases cover all three
  profiles and planning roles. Full suite: 111 files / 1,186 tests; TypeScript and
  scoped lint pass. Broader mobile and signed-in acceptance remain open.

Next: finish remaining role-specific demo deep links and browser hash-anchor
restoration, complete Partner/Student audience-claim mapping, and signed-in staging
acceptance of the local package when a staging release is authorized. Complete
report input/output parity separately; the demo builder's editable answers still
do not generate the prepared sample report. Parent pilot/snapshot follow-up stays
deferred as recorded above.

These checks do not complete responsive browser review, signed-in end-to-end
acceptance, full demo/live report parity, partner verification or production
readiness. This follow-up package is local and uncommitted; no push, migration,
deployment, publish, partner outreach or production action was performed.
The two shared-form Fast Refresh warnings are development-tool warnings; lint
on the new/shared components had no errors.

### Execution order and release evidence

1. Stabilize the current local dashboard/navigation work; fix real-directory wiring,
   terminology and resource gaps; run TypeScript, unit and navigation checks.
2. Finish Pathway Builder/demo/report parity and the audience-feature mapping.
3. Strengthen partner profiles, opportunities, taxonomy, sourcing and the 25-partner
   outreach pipeline; verify listings separately from relationship approval.
4. Deepen reviewed-document provenance, IEP/PPT scripts and progress monitoring.
5. Owner management audit, licensing journey tests, pricing research and channel
   communication/conferencing design.
6. Reconcile production-readiness evidence and perform only separately authorized
   staging/release actions. Build/test success is not live acceptance.

The production audit remains NO-GO. Restore-drill evidence is complete although
an older blocker says otherwise. `audit-state.json` records seven pending
production migrations; the prose release checklist's three-migration count is
stale. Reconcile against recorded history before proposing a maintenance window.
Current controls remain in `docs/production-readiness/release-checklist.md` and
`docs/release-readiness/blockers.md`; no automatic merge/publish/migration.

### Partner outreach and verification acceptance

Use the existing owner outreach log for contacts, summaries, outcomes and follow-up
dates. Prepare records with organization/program, official URL, age/grade fit,
pathway, region, supports/AT, eligibility, cost, transportation, contact channel,
source/review date, relationship status, verification evidence and next action.
A directory lead, featured placement, or researched website is not an established
partner relationship. Count toward 25 only after organization/contact validation,
confirmed current offering, listing permission/relationship agreement and a logged
review. Keep stale/inactive offerings separate from available opportunities.

Draft outreach for owner editing (not sent; finalize together before sending):

**Subject: Connecting Connecticut students with [Organization]'s programs**

Hi [First name],

I'm [Name], [Title] at TransitionForward. We're building a Connecticut platform
that helps students, families and educators turn a student's strengths, interests
and support needs into practical next steps for education, work and community life.

I came across [specific program] on [official source] and thought it could be a
useful option for students exploring [relevant interest/pathway]. We'd like to
learn more and discuss including your organization in our Partner Network.

Our proposed starting point is straightforward: review a profile with your team,
confirm the programs you currently offer, and give families clear information
about eligibility, accessibility supports, location, cost and how to get started.
We also want providers to have a clear way to keep their profile and opportunities
up to date as the platform develops.

Would you be available for a brief introductory conversation, or is there someone
else on your team I should contact? I'm happy to send a draft listing for review
first. We would confirm your participation before describing your organization
as a verified TransitionForward partner.

Thank you,
[Name]
[Title] | TransitionForward
[Reply-to email]
[Website]

Follow-up draft (after an agreed outreach interval): “Hi [First name], following
up on my note about [specific program]. Would a short draft directory listing be
a useful starting point for your team to review? If a different person handles
community partnerships, I'd appreciate being pointed in the right direction.”

Personalize for each program; do not imply an existing relationship. Fee terms,
launch availability, sender identity and outreach timing remain to be finalized.

### Primary-source research started September 29, 2026

- [Connecticut IEP Manual: goals and objectives](https://portal.ct.gov/sde/special-education/connecticut-iep-manual/section-4-annual-goals-and-short-term-objectives)
- [Connecticut IEP Manual: progress reporting](https://portal.ct.gov/sde/special-education/connecticut-iep-manual/section-12-progress-reporting)
- [Connecticut AT documentation, implementation and effectiveness](https://portal.ct.gov/SDE/Publications/Assistive-Technology-Guidelines-Section-1-For-Ages-3-22/Documentation-Implementation-And-Effectiveness)
- [ParentSquare classroom communication](https://www.parentsquare.com/platform/classroom-communications/)

These inform design research; they do not establish full legal/compliance review
or vendor integration. Recheck sources when implementing policy-dependent logic.

---


Living ledger that pairs a role-by-role product audit with the phased work
required to take the platform from "looks polished" to "ready to charge for".

Status legend: ✅ shipped · 🟡 in progress · ⬜ not started.

---

## 1. Role-by-Role Audit (snapshot)

### Student
- Action items, BridgeForward saves, JourneyStrip + OnboardingChecklist
  persistence, and the grade-band split (6–8 → BridgeForward, 9–12 → Pathway)
  all round-trip to the database.
- The no-linked-student state now offers a self-serve "Email an invite
  request" CTA — copies a short message and opens the user's mail app,
  no fake backend call.
- `OnboardingChecklist` already self-collapses once every step is done,
  so the JourneyStrip vs Checklist duplication is bounded.

### Parent / Guardian
- Document upload + parse, Pathway Report generate / regenerate / share /
  link, invite people, family priorities, and accept-proposed-goals all
  persist via typed server functions.
- Three entry points to Pathway Reports (dashboard, `/reports`,
  `/students/$id`) are noisy but consistent; we intentionally keep them
  for now and may consolidate post-launch.

### Educator / Case Manager
- Caseload search/filter, notes, quick-assign action items, teacher portal,
  and calendar all work end-to-end.
- "Missing Pathway Report" KPI is now a real button that filters the list
  to those students and scrolls to the table.
- `listStudentNotes` errors surface a toast instead of failing silently.

### School Admin
- Org switcher, team management, date-windowed reports, KPIs, grade-band
  breakdown, and compliance/milestones anchor all work.
- "Pathway Reports" KPI on `/school/overview` is now a link to the
  Reports list anchor — drill-down hardened.

### District Admin
- District switcher, KPIs, school-by-school table, CSV/PDF export, and
  follow-up list are real.
- Some metric duplication between progress bars and implementation tiles
  (e.g. reports_count, open_actions) is intentional dual-context display.

### Partner
- Org setup, opportunity CRUD with full status lifecycle
  (draft → pending_review → approved → inactive), multi-org switcher,
  PartnerForward incentives entry point — all work.
- Partner surfaces never expose IEPs, Student Voice, Pathway Reports, or
  private documents.

### Platform Admin / Owner
- KPIs, review queues, owner analytics, system health checklist (with
  honest `coming_soon` labels), 2FA, and `/admin` alias to `/owner` work.
- Misleading `{/* mock hub */}` comment on the landing page renamed to
  `feature preview (live composition)` so future agents do not mistake
  the live block for placeholder.

### Pathway Report (flagship)
- Every v2.1 schema field is now surfaced in the UI, including the
  previously unrendered `inputs_used` block — see "Sources Used in This
  Report" on each v2 report.
- Restoring a previous version now triggers a panel re-mount so the
  freshly-restored content appears at the top without a manual reload.

---

## 2. What Changed in This Slice

| Change | File(s) | Effect |
| --- | --- | --- |
| Render "Sources Used in This Report" panel | `src/components/pathway/ReportV2Extras.tsx`, `src/routes/_authenticated/reports.$reportId.tsx` | Users finally see which inputs the AI used (intake, voice, IEP docs, etc.). Hides on legacy reports. |
| Version panel refresh on restore | `src/routes/_authenticated/reports.$reportId.tsx`, existing `onRestored` hook in `ReportVersionsPanel` | Restoring a version now refetches the report and remounts the history panel. |
| Missing Pathway Report KPI → filter | `src/routes/_authenticated/caseload.tsx` | KPI tile is a button that sets the `no-report` filter and scrolls to the list. |
| Caseload notes error visibility | `src/routes/_authenticated/caseload.tsx` | `listStudentNotes` failures show a toast instead of being swallowed. |
| Student self-connect CTA | `src/components/dashboard/StudentDashboard.tsx` | Unlinked students get a "Email an invite request" button (copy + mailto), unblocking them without a fake backend write. |
| Pathway Reports KPI drill-down | `src/routes/_authenticated/school.overview.tsx` | Wraps the KPI in a `<Link>` to the school reports list anchor. |
| Landing-page comment fix | `src/routes/index.tsx` | Renames the misleading `{/* mock hub */}` so the live block is not mistaken for placeholder. |

No schema migrations, no role-guard changes, no test-ID changes, no
modifications to `_authenticated/route.tsx`, auth, or 2FA.

---

## 3. Roadmap

### P0 — Required Before Market Release
- 🟡 **Entitlement enforcement on writes.** Server-side `requireFeatureEntitlement`
  helper (`src/lib/entitlement-guard.ts`) calls `user_has_feature` and is now
  invoked at the top of `createPathwayReport`, `regeneratePathwayReport`,
  `createShareToken`, and `createOpportunity`. Platform admins bypass.
  **Warn-only by default** so current pilot users without entitlement rows
  are not broken. Set `TF_ENFORCE_ENTITLEMENTS=1` in the server environment
  to flip the guard from warn to throw — no code change required at market
  release. Remaining work: extend guard to `updateOpportunity` once partner
  pricing is locked, plus a friendly upsell screen for the
  `EntitlementRequiredError` thrown to clients.
- **Notifications.** 🟡 In-app bell now resolves a deep link per row via
  `src/lib/notification-links.ts` (reports, students, documents, meetings,
  messages, goals, invitations) and auto-marks-read on click. Remaining:
  ensure server-side writers populate `related_record_type`/`_id` for every
  emitted notification, and add an email digest fallback (P1).
- **Consent & sharing panel.** 🟡 New `WhoCanSeeThisPanel` on
  `/students/$studentId` consolidates accepted collaborators, approved
  family/case-manager relationships, and active (non-revoked, non-expired)
  share tokens into one "Who Can See This?" view, backed by
  `getStudentAccessOverview` in `src/lib/sharing.functions.ts`. Granular
  management stays in the existing panels. Remaining: per-row revoke
  shortcut and an inline consent revocation flow.
- **Document review workflow.** 🟡 Documents hub at `/documents` now surfaces
  an explicit 4-step reviewer pipeline (`uploaded` → `ai_extracted` →
  `in_review` → `linked`) derived from `document_extractions.status` in
  `src/lib/cross-docs.functions.ts`. Each stage has its own filter chip,
  badge, and CTA: `ai_extracted` / `in_review` rows deep-link to
  `/documents/$documentId/review` ("Continue review"), while `uploaded` /
  `linked` rows still open the student. Legacy docs with a `parsed_summary`
  but no extraction row keep their old "summarized" behavior by mapping to
  `linked`. Remaining: a small "Run extraction" CTA on `uploaded` rows so
  the hub can kick off review without bouncing to the student page (P1).
- **Deterministic PDF export.** Server-rendered PDF for at least the
  educator audience, with audience watermark — replace `window.print()`
  for the share/export path.
- **Launch readiness checklist.** Materialize `/owner/launch` against
  `system_health_checks` outcomes so go/no-go is data-driven.

### P1 — Important Shortly After Release ⬜
- **District-paid access propagation.** UI-side gating on `effective_entitlement_for_user`
  so connected schools/families inherit entitlement from the paying
  district org.
- **Family early-access flow.** Pilot vs post-pilot copy + invite codes.
- **Partner moderation queue.** Owner review with diff view between
  previous and pending opportunity edits.
- **AI content review loop.** Thumbs row per Pathway Report section
  writing to `admin_audit_reviews` for owner QA.
- **Opportunity inquiry inbox.** Partner-safe inbox exposing counts +
  first name only, never IEP / Pathway / voice data.
- **Student rights at 18.** Surface `rights_transfer_status` on student
  profile and Pathway Report header with the recommended action.
- **Email digest.** Daily/weekly summary from `in_app_notifications` +
  `notification_prefs`.

### P2 — Future Expansion ⬜
- Public-facing partner directory.
- District benchmarks across CT districts (anonymized).
- Multi-language Pathway Report (AI assist scaffolding exists).
- Mobile-first parent PWA shell.
- Long-form analytics (cohort + year-over-year).
- Archive / data-deletion lifecycle with audit trail (`audit_log` exists).
- Support / help center beyond `/help` placeholder.

---

## 4. Constraints Honored

- `_authenticated/route.tsx`, role guards (`withRoleGuard`, `has_role`),
  owner 2FA, `/auth`, and dashboard `<main>` test IDs were not touched.
- No new top-level routes, no schema changes, no new dependencies.
- All new persistence happens through existing server functions; the only
  user-facing flow without a DB write is the student self-invite mailto,
  which is intentional — a fake "Send invite" button would violate the
  no-inert-button rule, and a real self-invite is queued under P1.

## Generated-document presentation standard — October 5, 2026

Every generated document/export must use readable text, clear hierarchy, generous but economical line spacing, stable margins, sensible page breaks, no clipped/overlapping text and no site navigation/marketing/floating controls. Incorporate the approved logo where the format supports it, without stretching or inventing a replacement mark. Preserve source/evidence caveats and distinguish demo data. Assess all applicable roles and demo/live versions; branding never expands access.

Local first pass adds a compact print-only approved logo header and Letter margins to PPT packets, plus the approved logo on the Pathway Report print cover. Meeting notes now share the compact logo header and document-only print rules. Progress-monitoring exports, document/IEP explanations and other generated tools remain explicitly in the export audit; no claim of completed visual acceptance for all outputs. Browser/PDF visual verification remains required before closing this work.

## User-facing language standard

Every user-facing screen, message and generated output should use clear, respectful everyday language, concrete next steps and short sentences. Explain necessary acronyms and specialist terms on first use; retain accurate policy/evidence terms rather than changing their meaning. Avoid internal implementation language and unsupported promises. Assess applicability across all roles and demo/live versions. Shared structured-generation instructions now apply this standard to prose without altering schema keys, identifiers or permissions. Current PPT and partner-preparation copy is revised locally; the whole-product language audit remains open.

## Printable-document scope — PR211 clarification

Document formatting applies only to actual printable/exportable/PDF documents and their on-screen document views. Current PR211 coverage is PPT meeting preparation, meeting summaries and Pathway Reports. Their readable screen presentation and approved branding carry through to print; printing removes interactive controls and site chrome while preserving document headings and notes. Existing report presentation and role permissions are preserved.

Formatting changes were withdrawn from dashboard summary/translator/readiness cards, interactive assistant content, explanation cards, Readiness Snapshot and IEP review forms because those views do not currently expose document export. Add document formatting if and when they have a real document output, rather than restyling the tool or dashboard. The everyday-language standard still applies throughout the product.

Four credential-free browser cases cover shared Family/Educator document presentation at 390px and 1024px: visible screen content/branding, long-text wrapping without horizontal scrolling, printable document headings/notes and removal of external controls. Run `playwright test --config tests/e2e/document-presentation.config.ts`; no app server, credentials, AI or database writes. Full generated-document pagination remains open. PR211 remains a draft; no new release or production change.

## Full PPT document pagination check — October 5, 2026

Extracted the actual PPT presentation into a pure document renderer; account actions remain in the guarded route with the same student, team category, priority and error feedback. Two synthetic full-length documents were rendered locally to four-page PDFs, with no AI calls or account/database access. Every page was rendered and visually inspected. Checks confirmed all agenda/questions/evidence/scripts/closing content, safe horizontal text margins, readable approved logo, page numbers, no external site chrome and a clean paper background. Closing callouts are kept together. This is synthetic layout acceptance, not a new live-generation quality run. Meeting-summary and Pathway Report pagination remain open.

## Export watermark request

Actual printable documents (PPT, meeting summaries, Pathway Reports) now include a small decorative approved-logo watermark in export, hidden on screen. Use restrained opacity and preserve text legibility, approved mark proportions and existing permissions. The mark complements the document's visible branding; it is not proof of verification, authorship or compliance. Check its position in paginated PDFs before closing acceptance.

Watermark QA: verified on every page of both four-page synthetic PPT documents. The first outside-margin position was clipped by Chromium and was corrected to a faint lower-corner mark inside the printable area. Approved icon proportions preserved; screen-hidden/export-visible behavior and decorative accessibility semantics covered by tests. TypeScript, 20 focused tests and four browser cases passed. Meeting-summary and Pathway Report watermark/pagination visual acceptance remain open.

## Brochure-style document direction

User clarified that actual printable/exportable documents should be compact, creative and readable like a pamphlet/brochure, rather than a collection of notes. PPT now uses lighter agenda dividers, restrained script accents, a two-column questions/what-to-bring area at wider widths and plain headings ("Your meeting plan," "What to bring," "Ways to say it"). Screen and print share this content and structure. Report exports flow long sections naturally rather than forcing every section onto a separate page; readable typography and evidence cautions remain. Report wording includes "At a glance" and "Meeting guide."

Meeting export audit found scrollable textareas could clip long notes: full values now print as wrapping text, preserving line breaks, with readable dates/action statuses and no editing/template/evidence-action controls. Twenty-two focused tests passed. Offline actual report rendering blocks all server calls and uses the existing fictional demo fixture. Site chrome was removed from report print; complete report booklet pagination/watermark acceptance is still in progress. No new AI calls, database writes or release.

## Document heading and role/data standard — October 5, 2026

Use proper title case for document headings and subheadings, preserving acronyms and keeping short connecting words lowercase where appropriate. This supersedes the earlier sentence-case heading preference; body text remains everyday language. Shared document branding headers, PPT section/agenda headings and the revised report headings follow this convention. Audit other exportable documents as they adopt the brochure design.

Apply document design to applicable signed-in role views and their exports, with demo content clearly distinguished. Generated output must use authorized live records and the intended role/audience; do not substitute fictional demo data or invent missing evidence. PPT currently uses the selected accessible report/intake plus supplied concerns/outcomes, and includes both family and educator perspectives in a shared team guide. It is not yet a separately role-tailored generation prompt. Audit and strengthen role-specific generation inputs across each actual document before claiming all outputs are role-specific. Preserve permissions; Owner Hub remains management-only. Full role/data coverage and remaining export pagination checks are open.

## Report export integrity and meeting-note checks — October 5, 2026

Report export now has a consistent named page size/margins, approved visible document header, real page counters and a stable faint 20px mark in the outer upper corner. Removed obsolete full-bleed cover rules and decorative printed folios. Closed postsecondary-goal accordions previously omitted their details from export; a shared detail renderer now supplies the same live fields to the on-screen accordion and a complete print-only goal view, with each goal kept together. Plain headings include “Where Things Stand,” “Draft Goal to Discuss” and “Information to Gather.” The selected 30/60/90-day action-plan period is printed explicitly; inactive periods are not claimed as exported.

Offline Family/Educator PDFs use the existing fictional sample with server calls blocked. Verified all four goal areas' status/direction/rationale/draft-goal/next-step/support/evidence fields and page counters in both outputs. Longer report length and further brochure compaction remain open; this is not a new live-generation or whole-product acceptance claim. TypeScript, seven focused document tests and four mobile/desktop browser cases passed. Browser regressions now cover long complete meeting-note values, replacing clipped editing viewports in print. Full signed-in meeting-summary pagination remains open. No AI calls, database writes, merge, deployment or production change.

## Compact meeting-summary pass and report spreads — October 5, 2026

Meeting document headings now use title case and plain labels, with lighter printed dividers and compact typography. Saved question responses are shown when present; action owners/due dates/status and agenda completion status remain visible in export. Completed entries are readable rather than faded/struck through on paper. Print-only gutter keeps the decorative watermark clear of text. Existing editing/save handlers and role guards are preserved.

Rendered the actual meeting route offline with fictional fixture-only responses; every other server function throws and all browser network requests are intercepted. The three-page long-note fixture preserves all six note fields through the final line, both saved answers, action owners/dates/statuses and completed/to-discuss agenda labels; no site chrome or editing actions. Every meeting page was visually reviewed. This verifies local presentation, not signed-in backend acceptance.

Report spreads now use two readable columns in export, reducing the same complete sample from 38 to 36 pages. Screen line clamps/truncation are disabled in print, checklist marks have readable contrast and draft cautions stay together. Both role fixtures preserve all goal fields and counters. Full report compaction/pagination remains open; selected spread/goal pages have been reviewed, not every final 36-page variant. No new AI calls, database changes or release.

## Document symmetry and heading uniformity — October 5, 2026

Use one shared document hierarchy for titles and section/subsection headings: consistent serif family, weight, size steps, left alignment and proper title case. Shared layout rules now apply through DocumentViewStyles to actual PPT, meeting-summary and Pathway Report views; older report-specific overrides no longer replace that hierarchy. Equal half-inch outer export margins and equal 24px inner gutters keep the logo watermark clear while balancing the page. Columns use equal widths and a consistent gap without one-sided sidebar padding. Removed the hidden-action placeholder that shifted meeting titles away from their content edge. The PPT closing section is now a semantic heading in the same hierarchy.

The same representative Family/Educator meeting guides remain two pages. Reviewed updated meeting and report sample pages, with offline authorized-data substitutes and no real records. TypeScript, seven focused tests and four browser cases passed; browser cases now explicitly check equal gutters, a shared heading font and left alignment at mobile/desktop widths. Full final report pagination, remaining export types and signed-in release acceptance are still open. Preserve role permissions and generation inputs. This design standard applies to future actual document outputs; it is not a dashboard/tool restyle. Draft PR211 only; no release or production change.

## Preserve Lovable Visual Edits — October 5, 2026

Preserved the owner’s Lovable demo heading edit, “Your Dashboard Widgets,” in the shared demo/signed-in widget board. Before any source/archive sync into Lovable, inspect builder changes and connected Git history, import and review pending edits, and reconcile conflicts with the current release branch. Do not replace builder source while unpreserved edits exist. A builder edit is not assumed to have reached GitHub automatically. Staging and production releases remain separately authorized.

## Standing Demo Parity Review — October 5, 2026

For every product change, assess all applicable roles and demo modes in the same change. Prefer shared components for layouts, labels, navigation and document rendering; use explicitly fictional demo data and preserve permissions. Record any missing counterpart as open work rather than claiming full parity. Check both views before release. Preserve pending Lovable visual edits before source sync.

Confirmed: demo and signed-in widget boards share DashboardWidgetBoardView; BuilderSampleReport shares ReportView. Open: the demo meeting-prep preview remains a brief status list and does not yet demonstrate the polished PptAgendaDocument. Other legacy report/demo previews and school/district export demonstrations still require parity review. No blanket parity claim.

School and district PDF exports now share branded Letter-page layout, uniform title-case headings, equal gutters, small watermark, wrapped tables and page counters. Existing role guards and source rows are unchanged. Three focused export tests pass, including complete multi-page data and empty-period handling. School and district fictional sample PDF pages were visually reviewed. Shared document headings use Times-family styling to match direct PDF export. No release, AI calls or database changes.

## Dashboard Card Link Audit — October 5, 2026

Every linked label must lead to an existing role-authorized destination relevant to its card category. Checked primary card destinations for Family, Student, Educator, School Admin, District Admin and Partner against registered routes and permissions. Checked shared related links and real demo counterparts. Moved Family Goals & Progress from Connected Student to Pathway Report in shared demo/live mapping. Demo related links without a dedicated demo destination now remain absent rather than falling back to a signed-in route. Thirty-six focused checks passed. Owner remains management-only; no role dashboard added. Signed-in browser acceptance and release remain open.
