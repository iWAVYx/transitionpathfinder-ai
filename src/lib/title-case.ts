// Shared Title Case helper used across the app.
// - Preserves ALL-CAPS acronyms (IEP, PPT, DDS, AI, FAQ, etc.)
// - Keeps small words (and, the, of, to, in, for, on, via, …) lowercase
//   unless they are the first or last word.
// - Handles hyphen/slash compounds piece-by-piece.

const SMALL = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in", "nor",
  "of", "on", "or", "per", "the", "to", "vs", "via", "with",
]);

function titleCaseWord(word: string, forceCap: boolean): string {
  if (!word) return word;
  // Preserve all-caps tokens of 2+ chars (IEP, PPT, DDS, AI, FAQ, USA).
  if (/^[A-Z0-9]{2,}$/.test(word)) return word;
  const lower = word.toLowerCase();
  if (!forceCap && SMALL.has(lower)) return lower;
  // Handle hyphen / slash compounds: "post-secondary" -> "Post-Secondary"
  if (/[-/]/.test(lower)) {
    return lower
      .split(/([-/])/)
      .map((part) => (part === "-" || part === "/" ? part : titleCaseWord(part, true)))
      .join("");
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function toTitleCase(input?: string | null): string {
  if (!input) return "";
  const words = input.split(/(\s+)/);
  const wordIdxs = words
    .map((w, i) => (/\S/.test(w) ? i : -1))
    .filter((i) => i >= 0);
  const first = wordIdxs[0];
  const last = wordIdxs[wordIdxs.length - 1];
  return words
    .map((w, i) => (/\S/.test(w) ? titleCaseWord(w, i === first || i === last) : w))
    .join("");
}
