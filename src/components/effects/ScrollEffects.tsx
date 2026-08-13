/**
 * Wix-Studio-style scroll effects for React.
 * Pure CSS + a tiny scroll/IntersectionObserver layer — no extra deps.
 *
 * Honors prefers-reduced-motion automatically.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type ElementType,
} from "react";
import { cn } from "@/lib/utils";

import { toTitleCase } from "@/lib/title-case";
/* ---------------- prefers-reduced-motion ---------------- */
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

/* ---------------- useScrollProgress ----------------
 * Returns a 0..1 value tracking the element through the viewport.
 * 0 = element bottom enters viewport, 1 = element top leaves viewport.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [p, setP] = useState(0);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduced || typeof window === "undefined") return;
    let raf = 0;
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      const traveled = vh - rect.top;
      const next = Math.min(1, Math.max(0, traveled / total));
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

  return { ref, progress: p };
}

/* ---------------- Reveal ----------------
 * Fade/slide in once when entering viewport.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  y = 24,
  once = true,
  threshold = 0.15,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, once, threshold]);

  const style: CSSProperties = {
    transform: shown ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
    opacity: shown ? 1 : 0,
    transition: `transform 700ms cubic-bezier(.22,.61,.36,1) ${delay}ms, opacity 600ms ease-out ${delay}ms`,
    willChange: "transform, opacity",
  };

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}

/* ---------------- Parallax ----------------
 * translateY based on viewport scroll. `speed` -1..1.
 * Positive = element drifts UP slower than scroll (background-feel).
 */
export function Parallax({
  children,
  speed = 0.25,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  as?: ElementType;
}) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const offset = (progress - 0.5) * speed * 160; // px range ~±80
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        transform: `translate3d(0, ${offset.toFixed(2)}px, 0)`,
        willChange: "transform",
      }}
    >
      {children}
    </Tag>
  );
}

/* ---------------- ParallaxImage ----------------
 * Overflow-hidden wrapper with an image that drifts inside it.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  speed = 0.35,
  width,
  height,
  eager = false,
  sizes,
  srcSet,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  speed?: number;
  width?: number;
  height?: number;
  eager?: boolean;
  sizes?: string;
  srcSet?: string;
}) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const translate = (progress - 0.5) * speed * 100; // % of overflow
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error fetchPriority is valid HTML, types lag
        fetchpriority={eager ? "high" : "auto"}
        className={cn("absolute inset-0 h-[120%] w-full -top-[10%] object-cover", imgClassName)}
        style={{
          transform: `translate3d(0, ${translate.toFixed(2)}%, 0)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}


/* ---------------- StickyScrollStory ----------------
 * Tall section: caption column is sticky while the right column scrolls past.
 * Pass an array of "panels"; the active one fades in.
 */
export function StickyScrollStory({
  eyebrow,
  title,
  panels,
  className,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  panels: Array<{ title: string; body: string; image: string; alt: string; srcSet?: string; sizes?: string }>;
  className?: string;
}) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const activeIdx = Math.min(
    panels.length - 1,
    Math.max(0, Math.floor(progress * panels.length * 0.999)),
  );
  return (
    <section ref={ref} className={cn("relative", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header (always visible) */}
        <div className="mb-10 lg:hidden">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {typeof title === "string" ? toTitleCase(title) : title}
            </h2>
          )}
        </div>

        {/* Mobile / tablet: stacked panels with image + text together */}
        <div className="space-y-12 lg:hidden">
          {panels.map((p, i) => (
            <article key={i} className="space-y-5">
              <div className="overflow-hidden rounded-[1.75rem] shadow-lift">
                <img
                  src={p.image}
                  srcSet={p.srcSet}
                  sizes={p.sizes ?? "(min-width: 1024px) 50vw, 100vw"}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />

              </div>
              <div>
                <h3 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
                  {toTitleCase(p.title)}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {p.body}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Desktop: sticky scroll story */}
        <div className="hidden gap-12 lg:grid lg:grid-cols-2">
          <div className="lg:sticky lg:top-24 lg:self-start lg:py-14">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
                {typeof title === "string" ? toTitleCase(title) : title}
              </h2>
            )}
            <div className="relative mt-6 min-h-[14rem]">
              {panels.map((p, i) => (
                <div
                  key={i}
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ opacity: i === activeIdx ? 1 : 0 }}
                  aria-hidden={i !== activeIdx}
                >
                  <h3 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                    {toTitleCase(p.title)}
                  </h3>
                  <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {p.body}
                  </p>
                </div>
              ))}
              <div className="mt-auto flex gap-1.5 pt-[12rem]">
                {panels.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === activeIdx ? "w-8 bg-primary" : "w-4 bg-border",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-8 py-12 lg:py-14">
            {panels.map((p, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[2rem] shadow-lift transition-transform duration-700"
                style={{
                  transform: i === activeIdx ? "scale(1)" : "scale(0.97)",
                  opacity: i === activeIdx ? 1 : 0.55,
                }}
              >
                <img
                  src={p.image}
                  srcSet={p.srcSet}
                  sizes={p.sizes ?? "(min-width: 1024px) 50vw, 100vw"}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />

              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- ShapeScroll ----------------
 * A decorative SVG blob that rotates / scales / morphs with scroll.
 */
export function ShapeScroll({
  className,
  color = "currentColor",
  spin = 90,
  scale = 0.6,
  tilt = 0,
  drift = 0,
  gradientFrom,
  gradientTo,
}: {
  className?: string;
  color?: string;
  spin?: number;
  scale?: number;
  /** 3D tilt amplitude in degrees (rotateX/rotateY) for a dramatic perspective feel. */
  tilt?: number;
  /** Horizontal drift in px as the user scrolls. */
  drift?: number;
  /** Optional gradient fill — overrides `color` when set. */
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const rot = (progress - 0.5) * spin;
  const s = 1 + (progress - 0.5) * scale;
  const rx = (progress - 0.5) * tilt;
  const ry = (progress - 0.5) * tilt * -1.2;
  const tx = (progress - 0.5) * drift;
  const gradId = `tf-shape-grad-${gradientFrom ?? ""}-${gradientTo ?? ""}`.replace(/[^a-zA-Z0-9-]/g, "");
  const fill = gradientFrom && gradientTo ? `url(#${gradId})` : color;
  // Morph path between two organic blobs
  const d1 = "M40,-60C53,-50,66,-40,71,-27C76,-14,73,2,67,16C61,30,52,43,40,53C28,63,14,71,-2,73C-18,75,-36,72,-49,62C-62,52,-70,36,-71,20C-72,4,-66,-12,-58,-27C-50,-42,-39,-55,-25,-63C-11,-71,5,-73,21,-72C37,-71,52,-67,40,-60Z";
  const d2 = "M44,-62C56,-52,62,-36,66,-21C70,-6,72,8,68,22C64,36,54,50,40,58C26,66,8,68,-9,68C-26,68,-43,66,-55,57C-67,48,-74,32,-74,17C-74,2,-67,-13,-58,-27C-49,-41,-38,-54,-24,-61C-10,-68,6,-69,21,-68C36,-67,32,-72,44,-62Z";
  return (
    <div
      ref={ref}
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
      style={{ perspective: tilt ? "1400px" : undefined }}
    >
      <svg
        viewBox="-100 -100 200 200"
        className="h-full w-full"
        style={{
          transform: `translate3d(${tx.toFixed(2)}px,0,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`,
          transformStyle: "preserve-3d",
          transition: "transform 80ms linear",
          willChange: "transform",
          color,
          filter: tilt ? "drop-shadow(0 40px 60px rgba(0,0,0,0.22))" : undefined,
        }}
      >
        {gradientFrom && gradientTo && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
        )}
        <path
          d={progress > 0.5 ? d2 : d1}
          fill={fill}
          style={{ transition: "d 600ms ease" }}
        />
      </svg>
    </div>
  );
}

/* ---------------- Marquee ----------------
 * Auto-scrolling horizontal strip. Pause on hover.
 */
export function Marquee({
  items,
  speed = 40, // seconds per loop
  className,
  itemClassName,
}: {
  items: ReactNode[];
  speed?: number;
  className?: string;
  itemClassName?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const doubled = [...items, ...items];
  return (
    <div className={cn("group relative overflow-hidden", className)}>
      <div
        className="flex w-max gap-12 will-change-transform"
        style={{
          animation: reduced ? undefined : `tf-marquee ${speed}s linear infinite`,
          animationPlayState: reduced ? "paused" : undefined,
        }}
      >
        {doubled.map((it, i) => (
          <div key={i} className={cn("shrink-0", itemClassName)}>
            {it}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes tf-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .group:hover [style*="tf-marquee"] { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

/* ---------------- StickyHeader ----------------
 * Caption that "pins" inside a tall section while content scrolls past.
 * Lightweight wrapper around CSS `position: sticky`.
 */
export function Sticky({
  children,
  className,
  top = "5rem",
}: {
  children: ReactNode;
  className?: string;
  top?: string;
}) {
  return (
    <div className={cn("sticky", className)} style={{ top }}>
      {children}
    </div>
  );
}

/* ---------------- TextScrollFill ----------------
 * Large text whose color fills word-by-word as it scrolls into view.
 */
export function TextScrollFill({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const words = text.split(/\s+/);
  // useScrollProgress returns 0 when bottom enters viewport, 1 when top leaves.
  // The text is most "readable" between progress 0.35 (text near center) and
  // 0.75 (text just past center, about to leave). Map that band to 0..1 so
  // words light up exactly as the reader's eye is on them — not before, not after.
  const reading = Math.min(1, Math.max(0, (progress - 0.35) / 0.4));
  const lit = Math.min(words.length, Math.round(reading * words.length));
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className="transition-colors duration-300"
          style={{ color: i < lit ? "var(--foreground)" : "var(--muted-foreground)" }}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
