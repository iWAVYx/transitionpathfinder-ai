/**
 * Editorial Hybrid — chapter metadata shared between the demo step pages
 * and the Magazine reader chrome.
 *
 * The real source of truth is `src/lib/publication/nav.ts`. This module
 * derives the legacy `CHAPTER_META` shape from `PUBLICATION_PAGES` so that
 * existing demo route components and tests keep working without changes.
 */
import { PUBLICATION_PAGES, type PublicationPage } from "@/lib/publication/nav";

export interface ChapterMeta {
  id:
    | "intake"
    | "voice"
    | "documents"
    | "report"
    | "opportunities"
    | "resources"
    | "meeting"
    | "calendar"
    | "plan"
    | "hub"
    | "next";
  numeral: string;
  page: string;
  kicker: string;
  title: string;
  dek: string;
  covers: string[];
}

function toChapter(p: PublicationPage): ChapterMeta {
  return {
    id: p.id as ChapterMeta["id"],
    numeral: p.numeral,
    page: String(p.folio).padStart(2, "0"),
    kicker: p.kicker,
    title: p.title,
    dek: p.dek,
    covers: [...(p.covers ?? [])],
  };
}

const CHAPTER_IDS: ChapterMeta["id"][] = [
  "intake", "voice", "documents", "report", "opportunities",
  "resources", "meeting", "calendar", "plan", "hub", "next",
];

export const CHAPTER_META: Record<ChapterMeta["id"], ChapterMeta> =
  Object.fromEntries(
    CHAPTER_IDS.map((id) => {
      const page = PUBLICATION_PAGES.find((p) => p.id === id);
      if (!page) throw new Error(`[demo-chapters] missing publication page for "${id}"`);
      return [id, toChapter(page)];
    }),
  ) as Record<ChapterMeta["id"], ChapterMeta>;
