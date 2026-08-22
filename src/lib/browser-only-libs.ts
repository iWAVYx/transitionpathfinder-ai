function rejectServerImport(library: string): Promise<never> {
  return Promise.reject(new Error(`${library} is only available in the browser.`));
}

// Vite replaces import.meta.env.SSR at build time. Keeping the imports in the
// client branch prevents these large, interaction-only libraries from entering
// the SSR and Cloudflare Worker graphs.
export const loadPdfJs = import.meta.env.SSR
  ? () => rejectServerImport("PDF.js")
  : () => import("pdfjs-dist/legacy/build/pdf.mjs");

const loadPdfWorkerUrl = import.meta.env.SSR
  ? () => rejectServerImport("PDF.js worker")
  : () => import("pdfjs-dist/legacy/build/pdf.worker.mjs?url").then((module) => module.default);

export async function extractPdfText(file: File, maxPages = 40): Promise<string> {
  const [pdfjs, workerUrl] = await Promise.all([loadPdfJs(), loadPdfWorkerUrl()]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // PDF.js 6.2.108 contains the GHSA-hq66-cqwq-w95j fix. This path also uses
  // only the document text API; it never constructs the viewer/annotation
  // scripting layer that can execute embedded PDF actions.
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });

  try {
    const document = await loadingTask.promise;
    let output = "";
    const pageCount = Math.min(document.numPages, maxPages);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      output += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
      page.cleanup();
    }
    return output;
  } finally {
    await loadingTask.destroy();
  }
}

export const loadFflate = import.meta.env.SSR
  ? () => rejectServerImport("XLSX archive writer")
  : () => import("fflate");

export const loadJsPdf = import.meta.env.SSR
  ? () => rejectServerImport("jsPDF")
  : () => import("jspdf");

export const loadJsPdfAutoTable = import.meta.env.SSR
  ? () => rejectServerImport("jsPDF AutoTable")
  : () => import("jspdf-autotable");
