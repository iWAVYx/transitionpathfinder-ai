import { loadOrInitializeDocumentReview, parseDocumentReviewLoadRequest } from "./document-review-initialization.server";
import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractFromIep, type IepExtract } from "./iep-extract.functions";
import { documentTextExtractionRequest, replaceDocumentTextExtraction } from "./document-text-extraction.server";
import { applyReviewedExtractionWithAdmission, parseExtractionApplyRequest } from "./document-extraction-apply.server";

import { EXTRACTION_SECTION_KEYS, sectionEditRequest, metaEditRequest, saveManualReviewEdit } from "./document-review-edit.server";
export { EXTRACTION_SECTION_KEYS };

export type ExtractionSectionKey = (typeof EXTRACTION_SECTION_KEYS)[number];
export type SectionReviewState = "pending" | "accepted" | "edited" | "rejected" | "uncertain";

export type ExtractionSection = {
  state: SectionReviewState;
  value: string;
  original_value: string;
  notes: string;
};

export type ExtractionSections = Record<ExtractionSectionKey, ExtractionSection>;

function emptySections(extract?: Partial<IepExtract>): ExtractionSections {
  const out = {} as ExtractionSections;
  for (const k of EXTRACTION_SECTION_KEYS) {
    const v = (extract?.[k] ?? "") as string;
    out[k] = { state: "pending", value: v, original_value: v, notes: "" };
  }
  return out;
}

export const getOrCreateExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => parseDocumentReviewLoadRequest(input))
  .handler(async ({ data, context }) => {
    const result = await loadOrInitializeDocumentReview(context.supabase, context.userId, data);
    return { extraction: result.extraction as unknown as Database["public"]["Tables"]["document_extractions"]["Row"] };
  });

export const runExtractionFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => documentTextExtractionRequest.parse(i))
  .handler(async ({ data, context }) => {
    const result = await replaceDocumentTextExtraction(
      context.supabase, context.userId, data,
      async (text, actorId) => (await extractFromIep({ data: { text, expected_viewer_id: actorId } })).extract,
      extract => ({ raw_extract: extract as any, sections: emptySections(extract) as any, status: "needs_review" }),
    );
    return { extraction: result.extraction as Database["public"]["Tables"]["document_extractions"]["Row"] };
  });

export const updateExtractionSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => sectionEditRequest.parse(input))
  .handler(async ({ data, context }) => saveManualReviewEdit(context.supabase, context.userId, data, "section"));

export const updateExtractionMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => metaEditRequest.parse(input))
  .handler(async ({ data, context }) => saveManualReviewEdit(context.supabase, context.userId, data, "meta"));

export const applyAcceptedExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => parseExtractionApplyRequest(i))
  .handler(async ({ data, context }) => applyReviewedExtractionWithAdmission(context.supabase, context.userId, data));
