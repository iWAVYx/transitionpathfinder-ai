import { useEffect, useRef, useState } from "react";
import { useMotionSafe } from "./MotionSafe";

interface Props {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

/**
 * Count-up animation that respects prefers-reduced-motion (jumps straight to
 * the final value) and only starts once the element scrolls into view.
 */
export function AnimatedCounter({ value, duration = 900, className, suffix = "", prefix = "" }: Props) {
  const motion = useMotionSafe();
  const [display, setDisplay] = useState(motion ? 0 : value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!motion) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const from = 0;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(from + (value - from) * eased));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, motion]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
