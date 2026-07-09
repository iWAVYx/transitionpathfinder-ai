import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyKind =
  | "documents"
  | "tasks"
  | "meetings"
  | "resources"
  | "media"
  | "students"
  | "reports"
  | "generic";

interface Props {
  kind?: EmptyKind;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Friendly, hand-drawn illustrated empty state.
 * Uses the site's warm mustard / map / terra palette so it feels native.
 */
export function IllustratedEmptyState({
  kind = "generic",
  title,
  description,
  action,
  className,
  size = "md",
}: Props) {
  const sizes = {
    sm: { wrap: "p-5", svg: "h-20 w-28", title: "text-base", desc: "text-xs" },
    md: { wrap: "p-8", svg: "h-28 w-40", title: "text-lg", desc: "text-sm" },
    lg: { wrap: "p-10", svg: "h-36 w-52", title: "text-xl", desc: "text-sm" },
  }[size];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed border-border/60",
        "bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_oklab,var(--st-mustard,#e8b14a)_10%,transparent)_0%,transparent_55%),radial-gradient(120%_120%_at_100%_100%,color-mix(in_oklab,var(--st-map,#3a7ea1)_8%,transparent)_0%,transparent_55%)]",
        "text-center",
        sizes.wrap,
        className,
      )}
    >
      {/* floating hand-drawn dot cluster (background flourish) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 80"
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-32 opacity-40"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/50">
          <path d="M4 60 Q 40 20, 80 40 T 160 30" strokeLinecap="round" />
          <circle cx="20" cy="52" r="1.6" fill="currentColor" />
          <circle cx="60" cy="30" r="1.6" fill="currentColor" />
          <circle cx="110" cy="36" r="1.6" fill="currentColor" />
          <circle cx="160" cy="30" r="1.6" fill="currentColor" />
        </g>
      </svg>

      <div className={cn("mx-auto", sizes.svg)}>
        <Illustration kind={kind} />
      </div>

      <h3 className={cn("mt-4 font-display font-medium tracking-tight", sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("mx-auto mt-2 max-w-md text-muted-foreground", sizes.desc)}>
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function Illustration({ kind }: { kind: EmptyKind }) {
  const stroke = "#1b3a4b"; // ink navy
  const mustard = "#e8b14a";
  const terra = "#a83f2a";
  const map = "#3a7ea1";
  const cream = "#fbf7ef";
  const common = {
    stroke,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (kind) {
    case "documents":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          {/* back paper */}
          <g transform="rotate(-8 60 80)">
            <rect x="30" y="30" width="80" height="100" rx="4" {...common} fill={cream} />
            <path d="M42 52 h56 M42 66 h48 M42 80 h56 M42 94 h36" {...common} strokeWidth="1.5" />
          </g>
          {/* front paper */}
          <g transform="rotate(6 130 80)">
            <rect x="90" y="20" width="80" height="105" rx="4" {...common} fill="#fff" />
            <path d="M102 42 h56 M102 56 h56 M102 70 h44" {...common} strokeWidth="1.5" />
            <circle cx="150" cy="98" r="12" fill={mustard} stroke={stroke} strokeWidth="2" />
            <path d="M145 98 l4 4 l7 -8" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* sparkle */}
          <g stroke={terra} strokeWidth="1.5" strokeLinecap="round">
            <path d="M28 20 v6 M25 23 h6" />
          </g>
        </svg>
      );

    case "tasks":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          <rect x="34" y="20" width="132" height="105" rx="8" {...common} fill={cream} />
          {/* checklist rows */}
          <g {...common} strokeWidth="1.8">
            <rect x="50" y="40" width="14" height="14" rx="3" fill="#fff" />
            <path d="M53 47 l3 3 l6 -6" stroke={mustard} strokeWidth="2.2" />
            <path d="M74 47 h72" strokeWidth="1.5" />

            <rect x="50" y="66" width="14" height="14" rx="3" fill="#fff" />
            <path d="M53 73 l3 3 l6 -6" stroke={mustard} strokeWidth="2.2" />
            <path d="M74 73 h60" strokeWidth="1.5" />

            <rect x="50" y="92" width="14" height="14" rx="3" fill="#fff" />
            <path d="M74 99 h68" strokeWidth="1.5" />
          </g>
          {/* pencil */}
          <g transform="rotate(28 160 110)">
            <rect x="130" y="106" width="46" height="8" rx="2" fill={mustard} stroke={stroke} strokeWidth="1.5" />
            <path d="M176 106 l8 4 l-8 4 z" fill={terra} stroke={stroke} strokeWidth="1.5" />
          </g>
        </svg>
      );

    case "meetings":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          <rect x="36" y="30" width="128" height="95" rx="6" {...common} fill="#fff" />
          <path d="M36 52 h128" {...common} />
          <g {...common}>
            <path d="M60 28 v10 M100 28 v10 M140 28 v10" />
          </g>
          {/* grid dots */}
          <g fill={stroke}>
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3, 4, 5].map((c) => (
                <circle key={`${r}-${c}`} cx={54 + c * 18} cy={70 + r * 14} r="1.4" opacity="0.5" />
              )),
            )}
          </g>
          {/* highlighted day */}
          <rect x="92" y="78" width="20" height="14" rx="3" fill={mustard} stroke={stroke} strokeWidth="1.6" />
          {/* pin */}
          <g transform="translate(140 10)">
            <path d="M0 14 C 0 6 12 6 12 14 C 12 20 6 26 6 26 C 6 26 0 20 0 14 Z" fill={terra} stroke={stroke} strokeWidth="1.6" />
            <circle cx="6" cy="14" r="2.5" fill={cream} />
          </g>
        </svg>
      );

    case "resources":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          {/* stacked books */}
          <g {...common}>
            <rect x="30" y="90" width="150" height="18" rx="3" fill={mustard} />
            <rect x="42" y="72" width="126" height="18" rx="3" fill={cream} />
            <rect x="54" y="54" width="102" height="18" rx="3" fill={map} opacity="0.85" />
          </g>
          {/* open book on top */}
          <g transform="translate(60 20)">
            <path d="M0 30 C 20 22, 40 22, 40 30 L 40 42 C 40 34, 20 34, 0 42 Z" {...common} fill="#fff" />
            <path d="M40 30 C 60 22, 80 22, 80 30 L 80 42 C 80 34, 60 34, 40 42 Z" {...common} fill="#fff" />
            <path d="M40 30 v12" {...common} />
          </g>
          {/* sparkle */}
          <g stroke={terra} strokeWidth="1.5" strokeLinecap="round">
            <path d="M172 22 v6 M169 25 h6" />
          </g>
        </svg>
      );

    case "media":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          <rect x="30" y="26" width="140" height="92" rx="6" {...common} fill={cream} />
          <circle cx="70" cy="60" r="8" fill={mustard} stroke={stroke} strokeWidth="1.8" />
          <path d="M40 108 L 78 76 L 108 100 L 140 70 L 168 108 Z" fill={map} opacity="0.4" {...common} />
          <path d="M40 108 L 78 76 L 108 100 L 140 70 L 168 108" {...common} />
          {/* upload arrow */}
          <g transform="translate(150 12)">
            <circle cx="14" cy="14" r="14" fill={terra} />
            <path d="M14 8 v12 M8 14 l6 -6 l6 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      );

    case "students":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          {/* three avatars */}
          <g {...common}>
            <circle cx="60" cy="60" r="16" fill={mustard} />
            <path d="M40 100 C 40 84, 80 84, 80 100" />
            <circle cx="100" cy="52" r="18" fill={cream} />
            <path d="M78 100 C 78 82, 122 82, 122 100" />
            <circle cx="140" cy="60" r="16" fill={map} opacity="0.75" />
            <path d="M120 100 C 120 84, 160 84, 160 100" />
          </g>
          {/* dotted arc */}
          <path
            d="M30 118 Q 100 138, 170 118"
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "reports":
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          <rect x="34" y="20" width="132" height="105" rx="6" {...common} fill="#fff" />
          <path d="M46 44 h80" {...common} strokeWidth="1.5" />
          {/* bar chart */}
          <g {...common}>
            <rect x="50" y="80" width="14" height="30" fill={mustard} />
            <rect x="72" y="66" width="14" height="44" fill={map} opacity="0.75" />
            <rect x="94" y="90" width="14" height="20" fill={cream} />
            <rect x="116" y="58" width="14" height="52" fill={terra} opacity="0.85" />
          </g>
          <path d="M46 112 h108" {...common} />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full">
          <circle cx="100" cy="70" r="46" {...common} fill={cream} />
          <g stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M80 66 q 20 -18, 40 0" />
            <circle cx="86" cy="60" r="2" fill={stroke} />
            <circle cx="114" cy="60" r="2" fill={stroke} />
          </g>
          <g stroke={terra} strokeWidth="1.5" strokeLinecap="round">
            <path d="M40 40 v6 M37 43 h6" />
            <path d="M160 100 v6 M157 103 h6" />
          </g>
          <path d="M60 120 Q 100 132, 140 120" stroke={mustard} strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}
