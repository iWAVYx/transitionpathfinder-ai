import { createContext, useContext, type ReactNode } from "react";

const DocumentSectionTitleContext = createContext<string | null>(null);

/** A report section already supplies its accessible screen and print heading. */
export function DocumentSectionTitle({ title, children }: { title: string; children: ReactNode }) {
  return <DocumentSectionTitleContext.Provider value={title}>{children}</DocumentSectionTitleContext.Provider>;
}

export function useDocumentSectionTitle() { return useContext(DocumentSectionTitleContext); }

/** Compare labels without treating a genuinely different subheading as a duplicate. */
export function sameDocumentHeading(first: string | null, second: string) {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return first !== null && normalize(first) === normalize(second);
}
