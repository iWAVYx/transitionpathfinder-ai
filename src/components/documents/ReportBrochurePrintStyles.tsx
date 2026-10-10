/** Keep the report's editorial design while avoiding a separate page for every note. */
export function ReportBrochurePrintStyles() {
  return <style>{`
    /* A presentation table supplies a repeating print heading while keeping
       the existing screen layout and document reading order. */
    .report-root :is([data-report-pathway-pages], [data-report-career-pages]),
    .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > :is(thead, tbody),
    .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > :is(thead, tbody) > tr,
    .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > :is(thead, tbody) > tr > td {
      display: block; width: 100%; border: 0; padding: 0; margin: 0;
    }
    @media print {
      /* A screen framing rule before the named report page creates an empty PDF page. */
      body:has(.report-root) .eh-issue:has(.report-root)::before { display: none !important; }
      body:has(.report-root) .report-root :is([data-report-pathway-pages], [data-report-career-pages]) {
        display: table !important; table-layout: fixed; border-collapse: collapse;
        break-inside: auto !important; page-break-inside: auto !important;
      }
      body:has(.report-root) .report-root [data-report-pathway-pages] .pub-spread {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important; gap: 0.12in !important;
      }
      body:has(.report-root) .report-root [data-report-pathway-pages] .pub-spread-lead > div {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.08in 0.12in !important; align-items: stretch;
      }
      /* Match the action-column inset to the two detail columns; paired
         detail cards stretch to a shared baseline for their divider rules. */
      body:has(.report-root) .report-root [data-report-pathway-pages] .pub-spread-side {
        border-left: 0 !important; padding-left: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-pathway-pages] .pub-sidebar {
        padding: 0.04in 0 !important; border: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-pathway-pages] [data-report-pathway-detail] {
        padding-top: 0.04in !important; padding-bottom: 0.04in !important;
      }
      body:has(.report-root) .report-root [data-report-pathway-pages] .pub-checklist li + li { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > thead { display: table-header-group !important; }
      body:has(.report-root) .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > tbody { display: table-row-group !important; }
      body:has(.report-root) .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > :is(thead, tbody) > tr { display: table-row !important; }
      body:has(.report-root) .report-root :is([data-report-pathway-pages], [data-report-career-pages]) > :is(thead, tbody) > tr > td { display: table-cell !important; vertical-align: top; }

      /* A consistent body page keeps the corner mark and page count stable. */
      @page report-brochure {
        size: Letter; margin: 0.5in;
        @top-left { content: "TransitionForward"; font: 600 8.5pt sans-serif; color: #6b7280; }
        @bottom-left { content: "Pathway Report"; font: 400 8.5pt sans-serif; color: #9ca3af; }
        @bottom-right { content: counter(page) " / " counter(pages); font: 500 8.5pt sans-serif; color: #6b7280; }
      }
      body:has(.report-root) .report-root { page: report-brochure; }
      body:has(.report-root) .report-root .report-stage {
        margin-top: 0.16in !important; padding: 0 !important;
        break-before: auto !important; break-after: auto !important;
      }
      body:has(.report-root) .report-root .report-stage::before,
      body:has(.report-root) .report-root .report-stage > header::before,
      body:has(.report-root) .report-root .report-stage > header::after,
      body:has(.report-root) .report-root [data-report-section]::before { display: none !important; }
      body:has(.report-root) .report-root .report-stage-sections > * + * { margin-top: 0.12in !important; }
      /* Document sections should not inherit the screen's large chapter gaps. */
      body:has(.report-root) .report-root .report-block { margin-top: 0.12in !important; }
      body:has(.report-root) .report-root [data-report-block-heading] {
        margin-bottom: 0.08in !important; padding-bottom: 0.06in !important;
      }
      body:has(.report-root) .report-root [data-report-detail-row] {
        padding-top: 0.08in !important; padding-bottom: 0.08in !important;
      }
      body:has(.report-root) .report-root .report-stage > header p {
        margin-top: 0.03in !important; margin-bottom: 0 !important;
        font-size: 9.5pt !important; line-height: 1.35 !important;
      }
      body:has(.report-root) .report-root .report-stage > header h2 {
        margin: 0.04in 0 !important; font-size: 16pt !important; line-height: 1.2 !important;
      }
      body:has(.report-root) .report-root .report-stage > header > p:first-child {
        font-size: 8.5pt !important; line-height: 1.25 !important;
      }
      body:has(.report-root) .report-root .report-stage > header {
        margin-bottom: 0.08in !important; padding: 0.08in 0 !important; break-inside: avoid; break-after: avoid;
      }
      body:has(.report-root) .report-root #sec-thirty-day ol > li {
        padding-top: 0.12in !important; padding-bottom: 0.12in !important;
      }
      /* Compact planning cards without shrinking their main text or losing fields. */
      body:has(.report-root) .report-root #sec-thirty-day ol > [data-report-plan-step] {
        padding-top: 0.08in !important; padding-bottom: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-week] {
        width: 0.34in !important; height: 0.34in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-week] > span:first-child {
        text-transform: none !important; letter-spacing: normal !important; white-space: nowrap;
      }
      /* Short career records stay with their title; oversized records can still flow. */
      body:has(.report-root) .report-root [data-report-career-match] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-plan-heading] h3 {
        margin-top: 0.03in !important; font-size: 12pt !important; line-height: 1.3 !important;
        /* Each complete step is already grouped; its final heading must not
           chain this step to the next step or following report chapter. */
        break-after: auto !important; page-break-after: auto !important;
      }
      body:has(.report-root) .report-root [data-report-plan-meta] { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-plan-label][data-report-plan-label] {
        font-size: 9pt !important; line-height: 1.3 !important; letter-spacing: 0.04em !important;
      }
      body:has(.report-root) .report-root [data-report-plan-details] li + li,
      body:has(.report-root) .report-root [data-report-plan-actions] li + li { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-plan-readiness] .grid { margin-top: 0.04in !important; gap: 0.06in !important; }
      body:has(.report-root) .report-root [data-report-plan-step] {
        padding-left: 0.12in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step] p,
      body:has(.report-root) .report-root [data-report-plan-step] li { line-height: 1.35 !important; }
      body:has(.report-root) .report-root [data-report-plan-step] [data-report-plan-label][data-report-plan-label] { line-height: 1.3 !important; }
      body:has(.report-root) .report-root [data-report-export-period] > p { break-after: avoid !important; page-break-after: avoid !important; }
      body:has(.report-root) .report-root [data-report-export-period] > ol { break-before: avoid !important; }
      /* Full-width pillar recommendations pair explanation and next step.
         Multiple narrow cards retain their existing stacked details. */
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child > [data-report-recommendation-details] {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.08in 0.16in; padding: 0.08in !important; align-items: start;
      }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field] {
        min-width: 0; margin: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field="why"] { grid-column: 1; grid-row: 1; }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field="next"] { grid-column: 2; grid-row: 1; }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field="sources"] { grid-column: 1; grid-row: 2; }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field="owner"] { grid-column: 2; grid-row: 2; }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field] > p { margin: 0 !important; }
      body:has(.report-root) .report-root [data-report-pillar-recommendations] [data-report-recommendation]:only-child [data-report-recommendation-field] > p + p { margin-top: 0.04in !important; }
      /* Full planning cards use two balanced columns rather than four tall rows. */
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.08in 0.16in; align-items: start;
      }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) > [data-report-plan-heading] { grid-column: 1 / -1; }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) > [data-report-plan-details] {
        grid-column: 1; grid-row: 2 / span 2; display: block !important; margin-top: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) [data-report-plan-details] > div { margin-top: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) > [data-report-plan-actions] {
        grid-column: 2; grid-row: 2; grid-template-columns: minmax(0, 1fr) !important; margin-top: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) > [data-report-plan-readiness] {
        grid-column: 2; grid-row: 3; margin-top: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) [data-report-plan-readiness] .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) [data-report-plan-readiness] .grid > div:last-child { grid-column: 1 / -1; }
      body:has(.report-root) .report-root [data-report-plan-step]:has([data-report-plan-actions]):has([data-report-plan-readiness]) .rounded-2xl {
        padding: 0.04in !important;
      }
      body:has(.report-root) .report-root [data-report-complete-plan] ol > [data-report-plan-step] + [data-report-plan-step] { margin-top: 0.06in !important; }
      body:has(.report-root) .report-root [data-report-plan-actions] li { gap: 0.04in !important; }
      /* Keep short report units intact; oversized content can still flow across pages. */
      body:has(.report-root) .report-root [data-report-pathway-introduction],
      body:has(.report-root) .report-root [data-report-recommendation][data-report-recommendation] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      /* Keep short action stages, source summaries, role plans and closing details together.
         Oversized records still flow across pages at the normal reading size. */
      body:has(.report-root) .report-root .report-stage:has(#sec-thirty-day),
      body:has(.report-root) .report-root #v2-inputs-used,
      body:has(.report-root) .report-root .pub-page:has([data-report-role-plan]),
      body:has(.report-root) .report-root [data-report-closing-package] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root .pub-sidebar-label,
      body:has(.report-root) .report-root .pub-callout-label {
        break-after: avoid !important; page-break-after: avoid !important;
      }
      body:has(.report-root) .report-root .pub-sidebar-body,
      body:has(.report-root) .report-root .pub-callout-body {
        break-before: avoid !important; page-break-before: avoid !important;
      }
      /* Keep complete weeks together, but give their details balanced columns. */
      body:has(.report-root) .report-root [data-report-plan-step] { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-source-entry] { break-inside: avoid !important; page-break-inside: avoid !important; }
      body:has(.report-root) .report-root #sec-source-notes hr { break-after: avoid !important; page-break-after: avoid !important; }
      body:has(.report-root) .report-root [data-report-source-closing] { break-inside: avoid !important; page-break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-plan-details] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 0.15in !important; align-items: start;
      }
      body:has(.report-root) .report-root [data-report-plan-details] > * { min-width: 0; max-width: none !important; }
      body:has(.report-root) .report-root [data-report-printed-goals] .uppercase { text-transform: none !important; letter-spacing: normal !important; }
      body:has(.report-root) .report-root [data-report-printed-goals] > section { break-inside: avoid !important; page-break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-goal-details] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 0.08in !important; padding-bottom: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-goal-details] > * { margin-top: 0 !important; min-width: 0; }
      body:has(.report-root) .report-root [data-report-goal-followups] {
        display: grid !important; grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 0.12in !important; align-items: start;
      }
      body:has(.report-root) .report-root [data-report-goal-followups] > * {
        min-width: 0; break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-goal-details] p + p,
      body:has(.report-root) .report-root [data-report-plan-step] p + p { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-goal-details] .rounded-2xl {
        padding: 0.06in 0 !important;
      }
      /* Give each printed goal a clear boundary without changing the reading size. */
      body:has(.report-root) .report-root [data-report-goal-section] > h3,
      body:has(.report-root) .report-root [data-report-recorded-goal] > h3 {
        padding: 0.06in 0.1in !important; margin: 0 0 0.06in !important;
        border-left: 2px solid #6b3a91; border-bottom: 1px solid #ded3e8;
        background: #f7f2fa; color: #512875;
        overflow-wrap: anywhere; print-color-adjust: exact; -webkit-print-color-adjust: exact;
      }
      body:has(.report-root) .report-root [data-report-goal-section] + [data-report-goal-section] {
        margin-top: 0.16in !important;
      }
      /* Complete goal blocks can share a page without reducing their main text. */
      body:has(.report-root) .report-root [data-report-printed-goals] > section {
        margin-top: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-printed-goals] [data-report-goal-details] p,
      body:has(.report-root) .report-root [data-report-printed-goals] [data-report-goal-details] li {
        line-height: 1.3 !important;
      }
      body:has(.report-root) .report-root [data-report-printed-goals] [data-report-goal-details] > div > p:first-child {
        font-size: 9pt !important; line-height: 1.25 !important;
      }
      body:has(.report-root) .report-root [data-report-printed-goals] [data-report-goal-details] li + li {
        margin-top: 0.04in !important;
      }
      body:has(.report-root) .report-root [data-report-printed-goals] [data-report-goal-details] ul {
        margin-top: 0.03in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-heading] { gap: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-plan-details],
      body:has(.report-root) .report-root [data-report-plan-actions],
      body:has(.report-root) .report-root [data-report-plan-readiness] { margin-top: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-plan-actions] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-plan-step] .rounded-2xl { padding: 0.08in !important; }

      body:has(.report-root) .report-root [data-report-recorded-goals] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0.1in !important; }
      body:has(.report-root) .report-root [data-report-recorded-goal] { break-inside: avoid; padding: 0.1in !important; }
      body:has(.report-root) .report-root [data-report-recorded-goal][data-report-recorded-goal] h3 { margin-top: 0 !important; }
      body:has(.report-root) .report-root[data-age-aware-report] .pub-page:has([data-report-recorded-goals]) { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-readiness-grid] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0.08in 0.16in !important; }
      body:has(.report-root) .report-root [data-report-section-icon] { display: none !important; }
      /* Recorded indicators use equal print columns with aligned section rules.
         Screen rows and the recorded levels/notes stay unchanged. */
      body:has(.report-root) .report-root [data-report-readiness-indicators] {
        display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.08in 0.16in; align-items: stretch;
      }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li {
        min-width: 0; margin: 0 !important; padding: 0.06in 0 !important;
        border-top: 1px solid #ded8e7 !important; border-bottom: 0 !important;
      }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li > div {
        display: grid !important; grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.04in 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li > div > div { display: contents !important; }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li > div > div > p { grid-column: 1 / -1; }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li > div > div > p:first-child { grid-column: 1; grid-row: 1; }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li > div > span { grid-column: 2; grid-row: 1; }
      body:has(.report-root) .report-root [data-report-readiness-indicators] > li:last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
      /* Keep a readiness explanation with its growth step and suggested goal.
         Long entries can still flow when they exceed a complete page. */
      body:has(.report-root) .report-root [data-report-readiness-row],
      body:has(.report-root) .report-root [data-report-profile-summary],
      body:has(.report-root) .report-root [data-report-confidence],
      body:has(.report-root) .report-root [data-report-evidence-gap][data-report-evidence-gap] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-evidence-grid] {
        display: grid !important; grid-template-columns: repeat(var(--report-evidence-columns, 3), minmax(0, 1fr)) !important; gap: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-evidence-grid] > [data-report-evidence-gap][data-report-evidence-gap] {
        grid-column: auto !important; margin: 0 !important; width: auto !important; min-width: 0 !important;
        max-width: none !important; flex-basis: auto !important; padding: 0.08in !important;
      }
      body:has(.report-root) .report-root [data-report-stage="evidence"]:has([data-report-evidence-grid]) {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-readiness-heading][data-report-readiness-heading] h3,
      body:has(.report-root) .report-root [data-demo-readiness-overall][data-demo-readiness-overall] h3 { margin-top: 0 !important; }
      body:has(.report-root) .report-root[data-age-aware-report] .pub-page:has([data-report-readiness-grid]) { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-profile-details] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0.08in 0.16in !important;
      }
      body:has(.report-root) .report-root [data-report-profile-group] { break-inside: avoid; }
      body:has(.report-root) .report-root [data-report-profile-group] ul { margin-top: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-profile-group] li + li { margin-top: 0.03in !important; }
      /* Keep each category intact; longer profiles may continue onto the next page. */
      body:has(.report-root) .report-root[data-age-aware-report] #section-family_action_plan .pub-page { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-profile-group][data-report-profile-group] h3 { margin-top: 0 !important; margin-bottom: 0.04in !important; }
      body:has(.report-root) .report-root [data-report-voice-response] { break-inside: avoid; }
      body:has(.report-root) .report-root [data-report-voice-response] + [data-report-voice-response] { margin-top: 0.08in !important; }
      body:has(.report-root) .report-root [data-report-voice-response] .pub-pullquote { margin: 0 !important; padding: 0.06in 0.1in !important; }
      body:has(.report-root) .report-root [data-report-voice-response] blockquote { font-size: 12pt !important; line-height: 1.4 !important; }
      body:has(.report-root) .report-root [data-report-voice-response] figcaption {
        margin-top: 0.04in !important; font-size: 9.5pt !important; line-height: 1.35 !important;
        text-transform: none !important; letter-spacing: normal !important;
      }
      /* The decorative oversized quote can cross the page's top margin. */
      body:has(.report-root) .report-root .pub-pullquote blockquote::before {
        display: none !important;
      }
      body:has(.report-root) .report-root .pub-page-runninghead { display: none !important; }
      body:has(.report-root) .report-root .pub-spread { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.2in; }
      body:has(.report-root) .report-root .pub-spread > * { min-width: 0; }
      body:has(.report-root) .report-root .pub-spread-side {
        border-top: 0; border-left: 1px solid #ded8e7; padding-top: 0; padding-left: 0.15in;
      }
      body:has(.report-root) .report-root [class*="line-clamp-"] {
        display: block !important; -webkit-line-clamp: unset !important;
        overflow: visible !important; max-height: none !important;
      }
      body:has(.report-root) .report-root .truncate {
        white-space: normal !important; overflow: visible !important; text-overflow: clip !important;
      }
      body:has(.report-root) .report-root [data-document-caution],
      body:has(.report-root) .report-root [data-document-closing][data-document-closing] { break-inside: avoid !important; }
      /* The page margin already supplies closing space; avoid a padding-only tail page. */
      body:has(.report-root) .report-root:has(> [data-report-document-footer]) {
        padding-bottom: 0 !important;
      }
      /* Keep document-control labels with their values across page breaks. */
      body:has(.report-root) .report-root [data-report-document-footer] {
        margin-top: 0.04in !important;
      }
      body:has(.report-root) .report-root [data-report-document-footer] > div {
        padding: 0.1in !important;
      }
      body:has(.report-root) .report-root [data-report-planning-disclaimer][data-report-planning-disclaimer] {
        padding: 0.03in !important;
      }
      body:has(.report-root) .report-root [data-report-planning-disclaimer] > p:first-child {
        font-size: 8.5pt !important; line-height: 1.1 !important; letter-spacing: 0.08em !important;
        break-after: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-planning-disclaimer] > p + p {
        margin-top: 0.02in !important; font-size: 9.5pt !important; line-height: 1.2 !important;
      }
      body:has(.report-root) .report-root [data-report-document-details] {
        gap: 0.16in !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-document-details] > div {
        min-width: 0; break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-document-details] p:first-child {
        break-after: avoid !important; page-break-after: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-document-footer] > div:last-child {
        padding: 0.04in 0.06in !important; break-before: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-document-footer] > div:last-child p {
        font-size: 8.5pt !important; line-height: 1.2 !important;
      }
      /* Supporting document details should not become a mostly empty last page. */
      body:has(.report-root) .report-root [data-report-document-details][data-report-document-details] {
        gap: 0.12in !important; padding: 0.06in !important;
      }
      body:has(.report-root) .report-root [data-report-document-details][data-report-document-details] p {
        font-size: 9pt !important; line-height: 1.25 !important;
      }
      body:has(.report-root) .report-root [data-report-document-details][data-report-document-details] p + p {
        margin-top: 0.04in !important;
      }
      body:has(.report-root) .report-root [data-report-document-details][data-report-document-details] p:first-child {
        font-size: 8.5pt !important; line-height: 1.2 !important; letter-spacing: 0.1em !important;
      }
      body:has(.report-root) .report-root .pub-checklist-tick { color: #5b2a86 !important; background: transparent !important; }
      body:has(.report-root) .report-root .pub-checklist li { padding: 0.05in 0; }
      body:has(.report-root) .report-root .pub-page-opener {
        margin-bottom: 0.12in !important; break-inside: avoid; break-after: avoid !important;
        page-break-after: avoid !important;
      }
      body:has(.report-root) .report-root .pub-page-rule { margin-top: 0.1in !important; }
      body:has(.report-root) .report-root [data-report-labeled-field] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
      body:has(.report-root) .report-root [data-report-labeled-field] > p:first-child {
        break-after: avoid !important; page-break-after: avoid !important;
      }
      /* Keep subsection labels with their explanation when a page fills up. */
      body:has(.report-root) .report-root h2,
      body:has(.report-root) .report-root h3,
      body:has(.report-root) .report-root h4,
      body:has(.report-root) .report-root .pub-page-body p.font-semibold.uppercase {
        break-inside: avoid !important; break-after: avoid !important;
        page-break-after: avoid !important;
      }
      body:has(.report-root) .report-root .pub-page-body h2,
      body:has(.report-root) .report-root .pub-page-body h3 { margin-top: 0.15in !important; }

      body:has(.report-root) .report-root .page-break,
      body:has(.report-root) .report-root .report-stage,
      body:has(.report-root) .report-root .report-section,
      body:has(.report-root) .report-root .rounded-2xl,
      body:has(.report-root) .report-root .rounded-3xl {
        break-inside: auto !important; page-break-inside: auto !important;
      }
      body:has(.report-root) .report-root p,
      body:has(.report-root) .report-root li,
      body:has(.report-root) .report-root .pub-page-body {
        font-size: 10.5pt !important; line-height: 1.45 !important;
      }
      body:has(.report-root) .report-root .pub-callout,
      body:has(.report-root) .report-root .pub-checklist,
      body:has(.report-root) .report-root .pub-source {
        margin-top: 0.12in !important; margin-bottom: 0.12in !important;
      }

      body:has(.report-root) .report-root .report-section,
      body:has(.report-root) .report-root .report-header,
      body:has(.report-root) .report-root .exec-summary {
        break-before: auto !important; break-after: auto !important;
        page-break-before: auto !important; page-break-after: auto !important;
      }
      body:has(.report-root) .report-root .pub-page,
      body:has(.report-root) .report-root .eh-page,
      body:has(.report-root) .report-root .eh-chapter {
        min-height: 0 !important; height: auto !important;
        break-before: auto !important; break-after: auto !important; break-inside: auto !important;
        page-break-before: auto !important; page-break-after: auto !important; page-break-inside: auto !important;
        padding: 0.12in !important; margin: 0.08in 0 !important;
      }
      body:has(.report-root) .report-root .eh-chapter { break-inside: avoid !important; }
      body:has(.report-root) .report-root [data-report-meeting-summary] {
        break-inside: avoid !important; page-break-inside: avoid !important;
      }
    }
  `}</style>;
}
