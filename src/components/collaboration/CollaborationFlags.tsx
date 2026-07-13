import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Users, User, GraduationCap, FileText, Handshake, School, Building2,
} from "lucide-react";

export type FlagKey =
  | "parent_input"
  | "student_voice"
  | "educator_review"
  | "document_review"
  | "partner_match"
  | "school_support"
  | "district_support";

export type CollaborationFlag = {
  key: FlagKey;
  to?: string;
  hint?: string;
};

const META: Record<FlagKey, { label: string; Icon: typeof Users; cls: string; hint: string; to: string }> = {
  parent_input: {
    label: "Parent Input Needed",
    Icon: Users,
    cls: "bg-primary/10 text-primary",
    hint: "A caregiver hasn't confirmed priorities yet.",
    to: "/family/priorities",
  },
  student_voice: {
    label: "Student Voice Missing",
    Icon: User,
    cls: "bg-sky-soft text-ink",
    hint: "The student hasn't added their goals in their own words.",
    to: "/voice",
  },
  educator_review: {
    label: "Educator Review Needed",
    Icon: GraduationCap,
    cls: "bg-amber-100 text-amber-900",
    hint: "An educator should confirm the current draft.",
    to: "/educator/pending-input",
  },
  document_review: {
    label: "Document Review Needed",
    Icon: FileText,
    cls: "bg-amber-100 text-amber-900",
    hint: "One or more uploaded documents need a human review.",
    to: "/documents",
  },
  partner_match: {
    label: "Partner Match Available",
    Icon: Handshake,
    cls: "bg-emerald-100 text-emerald-900",
    hint: "A partner opportunity matches this student's profile.",
    to: "/opportunities",
  },
  school_support: {
    label: "School Support Flag",
    Icon: School,
    cls: "bg-destructive/10 text-destructive",
    hint: "A school-level support request is open.",
    to: "/school/implementation",
  },
  district_support: {
    label: "District Support Needed",
    Icon: Building2,
    cls: "bg-destructive/10 text-destructive",
    hint: "The district team should intervene.",
    to: "/district/implementation",
  },
};

interface Props {
  flags: CollaborationFlag[];
  className?: string;
  compact?: boolean;
}

export function CollaborationFlags({ flags, className, compact }: Props) {
  if (flags.length === 0) return null;
  return (
    <ul
      aria-label="Collaboration flags"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {flags.map((f) => {
        const m = META[f.key];
        const to = f.to ?? m.to;
        const chip = (
          <span
            title={f.hint ?? m.hint}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              m.cls,
            )}
          >
            <m.Icon className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} aria-hidden />
            {m.label}
          </span>
        );
        return (
          <li key={f.key}>
            {to ? (
              <Link to={to} className="transition hover:opacity-80">
                {chip}
              </Link>
            ) : (
              chip
            )}
          </li>
        );
      })}
    </ul>
  );
}
