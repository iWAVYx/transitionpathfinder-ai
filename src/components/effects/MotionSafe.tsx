import { useEffect, useState } from "react";

/** Returns true when the user has NOT requested reduced motion. */
export function useMotionSafe(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    setOk(mq.matches);
    const onChange = () => setOk(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return ok;
}
