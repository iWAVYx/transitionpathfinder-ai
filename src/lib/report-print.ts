/** Start the same branded print/PDF mode in live and demo report readers.
 * Returns cleanup for cancelled/unmounted controls; never sends report data.
 */
export function printPathwayReport(): () => void {
  if (typeof window === "undefined") return () => {};
  document.body.classList.add("print-magazine");
  const cleanup = () => {
    window.clearTimeout(timer);
    document.body.classList.remove("print-magazine");
    window.removeEventListener("afterprint", cleanup);
  };
  const timer = window.setTimeout(() => {
    try { window.print(); } catch { cleanup(); }
  }, 60);
  window.addEventListener("afterprint", cleanup);
  return cleanup;
}
