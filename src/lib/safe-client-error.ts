export type SafeClientErrorKind =
  "route-module-load" | "react-hook-order" | "runtime-type" | "network" | "unknown";

/**
 * Convert a browser error into a fixed diagnostic category. The original
 * message and stack may contain URLs or student context, so callers must never
 * persist or print them.
 */
export function classifySafeClientError(value: unknown): SafeClientErrorKind {
  if (!(value instanceof Error)) return "unknown";

  const signal = `${value.name} ${value.message}`.toLowerCase();
  if (
    signal.includes("chunkloaderror") ||
    signal.includes("loading chunk") ||
    signal.includes("dynamically imported module") ||
    signal.includes("importing a module script")
  ) {
    return "route-module-load";
  }
  if (
    signal.includes("rendered more hooks") ||
    signal.includes("rendered fewer hooks") ||
    signal.includes("invalid hook call")
  ) {
    return "react-hook-order";
  }
  if (
    signal.includes("is not a function") ||
    signal.includes("cannot read properties") ||
    signal.includes("cannot destructure")
  ) {
    return "runtime-type";
  }
  if (signal.includes("networkerror") || signal.includes("failed to fetch")) {
    return "network";
  }
  return "unknown";
}
