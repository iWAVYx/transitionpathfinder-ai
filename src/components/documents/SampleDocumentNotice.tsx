/** Keep sample status inside the exported document, not only the surrounding demo page. */
export function SampleDocumentNotice() {
  return (
    <aside data-document-sample-notice className="my-3 rounded-lg border border-border/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <strong>Fictional Sample</strong>{" — "}
      This example contains no real student records. It is not an agreed plan or an assessment.
    </aside>
  );
}
