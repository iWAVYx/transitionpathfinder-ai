/** Print the complete field value rather than a scrollable form-control viewport. */
export function PrintedFieldValue({ value }: { value: string | null | undefined }) {
  return <p data-document-field-value className="hidden print:block whitespace-pre-wrap break-words text-sm leading-relaxed">{value?.trim() ? value : "Not recorded."}</p>;
}
