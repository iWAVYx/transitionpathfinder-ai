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
    { size: 520, color: "oklch(0.88 0.08 50 / 0.35)", invert: false, speed: 0.12 },
    { size: 360, color: "oklch(0.86 0.07 220 / 0.32)", invert: true, speed: 0.18 },
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
          const dx = reduced ? 0 : (coord.x - 0.5) * (b.invert ? -1 : 1) * 130 * (b.speed ?? 0.15);
          const dy = reduced ? 0 : (coord.y - 0.5) * (b.invert ? -1 : 1) * 130 * (b.speed ?? 0.15);
          const left = i === 0 ? 18 : 62;
          const top = i === 0 ? 22 : 58;
          return (
            <div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: b.size,
                height: b.size,
                left: `${left}%`,
                top: `${top}%`,
                background: b.color,
                transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`,
                transition: "transform 1100ms cubic-bezier(.22,.61,.36,1)",
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
  strength = 12,
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
        transition: "transform 450ms cubic-bezier(.22,.61,.36,1)",
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
      <div className="relative z-10 transition-all duration-[650ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:-translate-y-1 group-hover:opacity-0">
        {front}
      </div>
      <div
        className="absolute inset-0 z-20 flex translate-y-2 flex-col justify-center px-7 py-7 opacity-0 transition-all duration-[650ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:translate-y-0 group-hover:opacity-100"
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
  gradient = "linear-gradient(120deg, oklch(0.78 0.12 50), oklch(0.74 0.10 25), oklch(0.72 0.10 220), oklch(0.78 0.12 50))",
  animate = true,
}: {
  children: ReactNode;
  className?: string;
  image?: string;
  gradient?: string;
  animate?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const bg = image ? `url(${image}) center/cover` : gradient;
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: bg,
        backgroundSize: image ? "cover" : "220% 220%",
        WebkitBackgroundClip: "text",
        animation: animate && !image && !reduced ? "tf-text-pan 18s ease-in-out infinite" : undefined,
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
    transform: `scale(${(1 - progress * 0.04).toFixed(3)})`,
    opacity: 1 - progress * 0.12,
    transition: "transform 200ms linear, opacity 200ms linear",
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

  // Subtle morph: gentle radius drift, no rotation.
  const r1 = 24 + p * 22;
  const r2 = 46 - p * 18;
  const r3 = 28 + p * 18;
  const r4 = 42 - p * 16;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden border border-border/60 bg-card shadow-soft", className)}
      style={{
        borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r4}% ${r1}% ${r2}% ${r3}%`,
        transition: "border-radius 240ms ease-out",
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
  duration = 18,
  children,
}: {
  className?: string;
  delay?: number;
  duration?: number;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      className={cn("pointer-events-none", className)}
      style={{
        animation: reduced ? undefined : `tf-float ${duration}s ease-in-out ${delay}s infinite`,
      }}
      aria-hidden
    >
      {children}
      <style>{`@keyframes tf-float { 0%,100%{ transform: translate3d(0,0,0) rotate(0deg) } 33%{ transform: translate3d(8px,-12px,0) rotate(2deg) } 66%{ transform: translate3d(-6px,8px,0) rotate(-2deg) } }`}</style>
    </div>
  );
}

/* ---------------- Tilt3D ----------------
 * Perspective tilt on hover. Children at depth={n} translate in Z for
 * a "transparent-video / floating layers" parallax feel.
 */
export function Tilt3D({
  children,
  className,
  max = 10,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const reduced = usePrefersReducedMotion();

  const onMove = (e: ReactMouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setT({
      ry: (x - 0.5) * max * 2,
      rx: -(y - 0.5) * max * 2,
      gx: x * 100,
      gy: y * 100,
      active: true,
    });
  };
  const onLeave = () => setT({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("group/tilt relative [perspective:1200px]", className)}
    >
      <div
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`,
          transition: t.active
            ? "transform 120ms linear"
            : "transform 700ms cubic-bezier(.22,.61,.36,1)",
          willChange: "transform",
        }}
      >
        {children}
        {glare && !reduced && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
            aria-hidden
            style={{
              background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, oklch(1 0 0 / 0.35), transparent 55%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}
      </div>
    </div>
  );
}

/* TiltLayer — child of Tilt3D, lifts off the surface in Z. */
export function TiltLayer({
  depth = 24,
  children,
  className,
}: {
  depth?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("[transform-style:preserve-3d]", className)}
      style={{ transform: `translateZ(${depth}px)` }}
    >
      {children}
    </div>
  );
}

/* ---------------- HorizontalScroll ----------------
 * Pin a section while its horizontal track slides sideways with vertical scroll.
 * Provide a fixed `trackWidth` (e.g. "260vw") and a tall outer height.
 */
export function HorizontalScroll({
  children,
  className,
  height = "300vh",
  trackWidth = "260vw",
}: {
  children: ReactNode;
  className?: string;
  height?: string;
  trackWidth?: string;
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
      const total = r.height - vh;
      const next = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setP(next);
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

  return (
    <div ref={ref} className={cn("relative", className)} style={{ height }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          className="flex h-full items-center will-change-transform"
          style={{
            width: trackWidth,
            transform: reduced
              ? "none"
              : `translate3d(calc(${(-p * 100).toFixed(2)}% + ${(p * 100).toFixed(2)}vw), 0, 0)`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
