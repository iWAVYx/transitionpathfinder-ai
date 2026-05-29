/* Decorations — hand-drawn-feel SVG clipart and patterns to fill whitespace.
 * All components are decorative (aria-hidden), pointer-events-none, and
 * accept className for positioning. They use currentColor or theme tokens
 * so they tint to the surrounding text color.
 */
import { cn } from "@/lib/utils";

type DecoProps = { className?: string };

function wrap(className?: string, extra?: string) {
  return cn("pointer-events-none select-none", extra, className);
}

/* Dot field — soft repeating dot pattern for backgrounds */
export function DotField({ className }: DecoProps) {
  return (
    <svg
      className={wrap(className)}
      viewBox="0 0 200 200"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="tf-dot-field" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#tf-dot-field)" />
    </svg>
  );
}

/* Squiggle — flowing wave underline / divider */
export function Squiggle({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 220 24" fill="none" aria-hidden>
      <path
        d="M2 12 Q 18 0, 36 12 T 70 12 T 104 12 T 138 12 T 172 12 T 218 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Starburst — radiating lines / sparkle */
export function Starburst({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 100 100" fill="none" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r4 = (n: number) => Math.round(n * 10000) / 10000;
        const x1 = r4(50 + Math.cos(a) * 18);
        const y1 = r4(50 + Math.sin(a) * 18);
        const x2 = r4(50 + Math.cos(a) * 44);
        const y2 = r4(50 + Math.sin(a) * 44);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  );
}

/* Sparkle — four-point star */
export function Sparkle({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
    </svg>
  );
}

/* Arrow doodle — curved hand-drawn arrow */
export function ArrowDoodle({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 120 80" fill="none" aria-hidden>
      <path
        d="M6 12 C 30 4, 70 4, 100 30 C 108 38, 110 50, 100 64"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M86 56 L100 64 L96 48"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/* Paper plane — playful clipart */
export function PaperPlane({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M4 30 L60 6 L48 58 L30 40 Z" fill="currentColor" opacity="0.85" />
      <path d="M30 40 L60 6 L38 48 Z" fill="currentColor" opacity="0.5" />
      <path d="M30 40 L48 58 L38 48 Z" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

/* Open book clipart */
export function BookDoodle({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 80 64" fill="none" aria-hidden>
      <path d="M4 12 C 18 6, 34 8, 40 16 C 46 8, 62 6, 76 12 L 76 56 C 62 50, 46 52, 40 60 C 34 52, 18 50, 4 56 Z" fill="currentColor" opacity="0.18" />
      <path d="M4 12 C 18 6, 34 8, 40 16 L 40 60 C 34 52, 18 50, 4 56 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M76 12 C 62 6, 46 8, 40 16 L 40 60 C 46 52, 62 50, 76 56 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 22 L 32 18 M12 30 L 32 26 M12 38 L 32 34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 18 L 68 22 M48 26 L 68 30 M48 34 L 68 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* Compass-like circle with crosshair */
export function CompassRose({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />
      <path d="M50 4 L54 50 L50 96 L46 50 Z" fill="currentColor" opacity="0.6" />
      <path d="M4 50 L50 46 L96 50 L50 54 Z" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="50" r="3" fill="currentColor" />
    </svg>
  );
}

/* Confetti bits scattered */
export function Confetti({ className }: DecoProps) {
  const bits = [
    { x: 8, y: 18, r: 6, c: "var(--sky)" },
    { x: 60, y: 8, r: 4, c: "var(--peach)" },
    { x: 90, y: 30, r: 5, c: "var(--primary)" },
    { x: 30, y: 70, r: 7, c: "var(--peach)" },
    { x: 76, y: 70, r: 4, c: "var(--sky)" },
    { x: 50, y: 44, r: 3, c: "var(--primary)" },
  ];
  return (
    <svg className={wrap(className)} viewBox="0 0 100 100" aria-hidden>
      {bits.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity="0.7" />
      ))}
    </svg>
  );
}

/* Ribbon banner */
export function Ribbon({ className, label = "" }: DecoProps & { label?: string }) {
  return (
    <svg className={wrap(className)} viewBox="0 0 220 56" aria-hidden>
      <path
        d="M0 12 L 12 28 L 0 44 L 200 44 L 220 28 L 200 12 Z"
        fill="currentColor"
        opacity="0.18"
      />
      <text
        x="110"
        y="33"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="16"
        fill="currentColor"
      >
        {label}
      </text>
    </svg>
  );
}

/* Wavy underline accent under a heading */
export function UnderlineSwoosh({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 280 18" fill="none" aria-hidden>
      <path
        d="M4 12 C 60 -2, 140 18, 200 8 C 230 4, 260 10, 276 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* Concentric arcs (corner decoration) */
export function ArcStack({ className }: DecoProps) {
  return (
    <svg className={wrap(className)} viewBox="0 0 120 120" fill="none" aria-hidden>
      {[20, 36, 54, 74, 96].map((r, i) => (
        <circle
          key={i}
          cx="0"
          cy="120"
          r={r}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={0.55 - i * 0.08}
        />
      ))}
    </svg>
  );
}
