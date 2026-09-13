/**
 * Milestone Art — warm, student/family-friendly icon + illustration set
 * for the eight pathway milestones. Each entry pairs a Lucide icon (for
 * dense places like the PathwaySpine) with a small inline SVG vignette
 * (for chapter openers and badges) and a warm tint drawn from the
 * personality palette layered on top of Ocean Deep.
 *
 * Used by:
 *   - PathwaySpine ......... small icon on each milestone node
 *   - MilestoneBadge ....... warm chip on chapter openers
 *   - SpineUpdate .......... contributing-milestone glyph
 *
 * Pure presentation. No data. All hues map to existing personality tokens
 * in src/styles.css and stay scoped to .demo-shell / .report-shell.
 */
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ClipboardList,
  MessageCircleHeart,
  Users,
  GraduationCap,
  FileText,
  Sparkles,
  Compass,
  CalendarCheck,
  type LucideProps,
} from "lucide-react";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";

export interface MilestoneArt {
  /** Lucide icon used in dense placements (spine, inline). */
  Icon: ComponentType<LucideProps>;
  /** Warm tint — CSS color value tied to the personality palette. */
  hue: string;
  /** Companion soft tint (background wash). */
  hueSoft: string;
  /** Single-word feel — e.g. "warm", "calm" — for screen-reader labels. */
  mood: string;
  /** Small inline SVG vignette for chapter openers (44×44 viewBox). */
  Vignette: ComponentType<SVGProps<SVGSVGElement>>;
}

const v = (children: ReactNode) =>
  function Vignette(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 44 44" fill="none" aria-hidden {...props}>
        {children}
      </svg>
    );
  };

/** Hues are CSS literals tied to the warm personality layer. */
export const MILESTONE_ART: Record<PathwayMilestoneId, MilestoneArt> = {
  intake: {
    Icon: ClipboardList,
    hue: "#F2B84B",
    hueSoft: "#FBECCB",
    mood: "Welcoming",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#FBECCB" />
        <rect x="13" y="11" width="18" height="22" rx="3" fill="#FFFBF2" stroke="#8A5A12" strokeWidth="1.4" />
        <rect x="17" y="8" width="10" height="5" rx="1.5" fill="#F2B84B" />
        <path d="M16 19h12M16 23h12M16 27h8" stroke="#8A5A12" strokeWidth="1.2" strokeLinecap="round" />
      </>,
    ),
  },
  voice: {
    Icon: MessageCircleHeart,
    hue: "#7A3BAE",
    hueSoft: "#EADCF5",
    mood: "Listening",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#EADCF5" />
        <path
          d="M11 19c0-4.4 4.9-8 11-8s11 3.6 11 8-4.9 8-11 8c-1.2 0-2.3-.1-3.4-.4l-5.6 2.6 1.4-4.7C12.5 23.2 11 21.2 11 19Z"
          fill="#FBF7FF"
          stroke="#4A2270"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M22 22.5c-2.4-1.8-4-3-4-4.7 0-1.2.9-2.1 2.1-2.1.8 0 1.5.4 1.9 1 .4-.6 1.1-1 1.9-1 1.2 0 2.1.9 2.1 2.1 0 1.7-1.6 2.9-4 4.7Z"
          fill="#7A3BAE"
        />
      </>,
    ),
  },
  family: {
    Icon: Users,
    hue: "#5B2A86",
    hueSoft: "#EDE4F6",
    mood: "Together",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#EDE4F6" />
        <circle cx="16" cy="18" r="3.2" fill="#fff" stroke="#4A2270" strokeWidth="1.3" />
        <circle cx="28" cy="18" r="3.2" fill="#fff" stroke="#4A2270" strokeWidth="1.3" />
        <circle cx="22" cy="23.5" r="2.4" fill="#fff" stroke="#4A2270" strokeWidth="1.3" />
        <path
          d="M10 33c.8-3.4 3.4-5.4 6-5.4s4.2 1.4 5 3.1c.8-1.7 2.4-3.1 5-3.1s5.2 2 6 5.4"
          stroke="#4A2270"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M18 34c.5-1.6 1.8-2.6 4-2.6s3.5 1 4 2.6" stroke="#4A2270" strokeWidth="1.3" strokeLinecap="round" />
      </>,
    ),
  },
  educator: {
    Icon: GraduationCap,
    hue: "#0E6E68",
    hueSoft: "#D6F0EE",
    mood: "Guiding",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#D6F0EE" />
        <path d="M22 13 9 19l13 6 13-6-13-6Z" fill="#5B2A86" />
        <path d="M14 22v5c0 1.7 3.6 3.5 8 3.5s8-1.8 8-3.5v-5" stroke="#5B2A86" strokeWidth="1.5" fill="none" />
        <path d="M33 19v6" stroke="#F2B84B" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="33" cy="26.5" r="1.3" fill="#F2B84B" />
      </>,
    ),
  },
  documents: {
    Icon: FileText,
    hue: "#5C6270",
    hueSoft: "#E6E8EE",
    mood: "Evidence",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#E6E8EE" />
        <rect x="14" y="11" width="14" height="18" rx="2" fill="#fff" stroke="#242A33" strokeWidth="1.3" transform="rotate(-6 21 20)" />
        <rect x="17" y="14" width="14" height="18" rx="2" fill="#fff" stroke="#242A33" strokeWidth="1.3" />
        <path d="M20 19h8M20 22h8M20 25h5" stroke="#5B2A86" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="29" cy="29" r="3" fill="#F2B84B" stroke="#fff" strokeWidth="1.2" />
      </>,
    ),
  },
  readiness: {
    Icon: Sparkles,
    hue: "#F2B84B",
    hueSoft: "#FBECCB",
    mood: "Strengths",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#FBECCB" />
        <path
          d="M22 10c1 4.5 2.5 6 7 7-4.5 1-6 2.5-7 7-1-4.5-2.5-6-7-7 4.5-1 6-2.5 7-7Z"
          fill="#F2B84B"
          stroke="#8A5A12"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M32 24c.4 1.8 1 2.4 2.8 2.8-1.8.4-2.4 1-2.8 2.8-.4-1.8-1-2.4-2.8-2.8 1.8-.4 2.4-1 2.8-2.8Z" fill="#fff" stroke="#8A5A12" strokeWidth="1" />
        <path d="M14 28c.3 1.4.8 1.9 2.2 2.2-1.4.3-1.9.8-2.2 2.2-.3-1.4-.8-1.9-2.2-2.2 1.4-.3 1.9-.8 2.2-2.2Z" fill="#fff" stroke="#8A5A12" strokeWidth="1" />
      </>,
    ),
  },
  pathway: {
    Icon: Compass,
    hue: "#5B2A86",
    hueSoft: "#E4DCF0",
    mood: "Direction",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#E4DCF0" />
        <circle cx="22" cy="22" r="11" fill="#fff" stroke="#242A33" strokeWidth="1.4" />
        <path d="M22 14 24 22 22 30 20 22 22 14Z" fill="#5B2A86" />
        <path d="M14 22 22 20 30 22 22 24 14 22Z" fill="#F2B84B" />
        <circle cx="22" cy="22" r="1.6" fill="#242A33" />
      </>,
    ),
  },
  plan: {
    Icon: CalendarCheck,
    hue: "#19B7AE",
    hueSoft: "#D6F0EE",
    mood: "Doable",
    Vignette: v(
      <>
        <circle cx="22" cy="22" r="20" fill="#D6F0EE" />
        <rect x="11" y="13" width="22" height="20" rx="3" fill="#fff" stroke="#5B2A86" strokeWidth="1.4" />
        <path d="M11 18h22" stroke="#5B2A86" strokeWidth="1.4" />
        <path d="M16 11v5M28 11v5" stroke="#5B2A86" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M17 25.5l3.5 3.5 7-7" stroke="#0E6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>,
    ),
  },
};

export function getMilestoneArt(id: PathwayMilestoneId): MilestoneArt {
  return MILESTONE_ART[id];
}
