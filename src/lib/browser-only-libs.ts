function rejectServerImport(library: string): Promise<never> {
  return Promise.reject(new Error(`${library} is only available in the browser.`));
}

// Vite replaces import.meta.env.SSR at build time. Keeping the imports in the
// client branch prevents these large, interaction-only libraries from entering
// the SSR and Cloudflare Worker graphs.
export const loadPdfJs = import.meta.env.SSR
  ? () => rejectServerImport("PDF.js")
  : () => import("pdfjs-dist/legacy/build/pdf.mjs");

export const loadXlsx = import.meta.env.SSR
  ? () => rejectServerImport("SheetJS")
  : () => import("xlsx");

export const loadJsPdf = import.meta.env.SSR
  ? () => rejectServerImport("jsPDF")
  : () => import("jspdf");

export const loadJsPdfAutoTable = import.meta.env.SSR
  ? () => rejectServerImport("jsPDF AutoTable")
  : () => import("jspdf-autotable");
