import { toTitleCase } from "@/lib/title-case";

/** Display stored grade values without changing form values or database codes. */
export function formatGradeBand(value: string | null | undefined, empty = "Grade not set"): string {
  const label = value?.trim().replace(/_+/g, " ").replace(/\s+/g, " ");
  return label ? toTitleCase(label) : empty;
}
