/**
 * Immersive effects: cursor-tracking blobs, magnetic hover, hover-reveal,
 * text masks, sticky pin, scroll-driven shape morph.
 *
 * Pure CSS + tiny pointer/scroll listeners. Honors prefers-reduced-motion.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type ElementType,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/* ---------------- CursorField ----------------
 * Wrap a section. Decorative blobs inside follow (or invert) the cursor.
 */
export function CursorField({
  children,
  className,
  blobs = [
    { size: 420, color: "hsl(20 90% 75% / 0.55)", invert: false, speed: 0.18 },
    { size: 280, color: "hsl(200 85% 78% / 0.55)", invert: true, speed: 0.28 },
    { size: 200, color: "hsl(340 80% 80% / 0.5)", invert: false, speed: 0.4 },
  ],
}: {
  children: ReactNode;
  className?: string;
  blobs?: Array<{ size: number; color: string; invert?: boolean; speed?: number }>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [coord, setCoord] = useState({ x: 0.5, y: 0.5 });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCoord({ x, y }));
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {blobs.map((b, i) => {
          const dx = (coord.x - 0.5) * (b.invert ? -1 : 1) * 220 * (b.speed ?? 0.25);
          const dy = (coord.y - 0.5) * (b.invert ? -1 : 1) * 220 * (b.speed ?? 0.25);
          const left = 10 + ((i * 37) % 70);
          const top = 10 + ((i * 53) % 70);
          return (
            <div
              key={i}
              className="absolute rounded-full blur-3xl mix-blend-multiply"
              style={{
                width: b.size,
                height: b.size,
                left: `${left}%`,
                top: `${top}%`,
                background: b.color,
                transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`,
                transition: "transform 600ms cubic-bezier(.22,.61,.36,1)",
                willChange: "transform",
              }}
            />
          );
        })}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Magnetic ----------------
 * Element gently pulls toward the cursor on hover.
 */
export function Magnetic({
  children,
  strength = 22,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const reduced = usePrefersReducedMotion();

  const onMove = (e: ReactMouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
    const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
    setT({ x, y });
  };
  const onLeave = () => setT({ x: 0, y: 0 });

  return (
    <Tag
      ref={ref as never}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("inline-block", className)}
      style={{
        transform: `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0)`,
        transition: "transform 350ms cubic-bezier(.22,.61,.36,1)",
        willChange: "transform",
      }}
    >
      {children}
    </Tag>
  );
}

/* ---------------- HoverReveal ----------------
 * Front content hides on hover; back content is revealed underneath.
 */
export function HoverReveal({
  front,
  back,
  className,
  height = "auto",
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/60 bg-card",
        className,
      )}
      style={{ height }}
    >
      <div className="relative z-10 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:opacity-0">
        {front}
      </div>
      <div
        className="absolute inset-0 z-20 flex translate-y-4 flex-col justify-center px-7 py-7 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        aria-hidden
      >
        {back}
      </div>
    </div>
  );
}

/* ---------------- TextMask ----------------
 * Large headline filled with a moving gradient or image clipped to text.
 */
export function TextMask({
  children,
  className,
  image,
  gradient = "linear-gradient(120deg, hsl(20 95% 60%), hsl(340 90% 65%), hsl(200 90% 60%), hsl(40 95% 60%))",
  animate = true,
}: {
  children: ReactNode;
  className?: string;
  image?: string;
  gradient?: string;
  animate?: boolean;
}) {
  const bg = image ? `url(${image}) center/cover` : gradient;
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: bg,
        backgroundSize: image ? "cover" : "300% 300%",
        WebkitBackgroundClip: "text",
        animation: animate && !image ? "tf-text-pan 12s ease-in-out infinite" : undefined,
      }}
    >
      {children}
      <style>{`@keyframes tf-text-pan { 0%,100%{ background-position: 0% 50% } 50%{ background-position: 100% 50% } }`}</style>
    </span>
  );
}

/* ---------------- StickyPin ----------------
 * Pin a heading/card while the section scrolls past, with subtle scale-out.
 */
export function StickyPin({
  children,
  className,
  top = "6rem",
}: {
  children: ReactNode;
  className?: string;
  top?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = r.height - vh;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setProgress(p);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  const style: CSSProperties = {
    top,
    transform: `scale(${(1 - progress * 0.08).toFixed(3)})`,
    opacity: 1 - progress * 0.25,
    transition: "transform 100ms linear, opacity 100ms linear",
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="sticky" style={style}>
        {children}
      </div>
    </div>
  );
}

/* ---------------- MorphCard ----------------
 * Card whose corner radius and border-radius morph as it enters view.
 */
export function MorphCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState(0);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const next = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
      setP(next);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  // morph radius from squircle -> blob -> rounded
  const r1 = 8 + p * 60;
  const r2 = 80 - p * 70;
  const r3 = 20 + p * 50;
  const r4 = 60 - p * 40;
  const rot = (p - 0.5) * 6;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden border border-border/60 bg-card shadow-soft", className)}
      style={{
        borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r4}% ${r1}% ${r2}% ${r3}%`,
        transform: `rotate(${rot.toFixed(2)}deg)`,
        transition: "border-radius 120ms linear, transform 200ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- FloatingShape ----------------
 * Decorative SVG that gently floats in a loop — works without scroll.
 * Acts like a "transparent video" element without the bandwidth cost.
 */
export function FloatingShape({
  className,
  delay = 0,
  duration = 12,
  children,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("pointer-events-none", className)}
      style={{
        animation: `tf-float ${duration}s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden
    >
      {children}
      <style>{`@keyframes tf-float { 0%,100%{ transform: translate3d(0,0,0) rotate(0deg) } 33%{ transform: translate3d(14px,-22px,0) rotate(6deg) } 66%{ transform: translate3d(-10px,12px,0) rotate(-5deg) } }`}</style>
    </div>
  );
}
