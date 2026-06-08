import {
  Sparkles,
  ShieldCheck,
  Users,
  Link2,
  Eye,
  FileLock,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centralized, plain-language trust + privacy notes used across the app.
 * One component, many short variants, so wording stays consistent on:
 *  - AI-generated outputs (Pathway Report, PPT prep, suggestions)
 *  - Sharing dialogs (collaborators, share links)
 *  - Consent screens
 *  - Document uploads (IEPs, evaluations)
 *  - Resource Library / Partner Network surfaces
 *  - Admin-vs-school/district scope reminders
 *
 * Keep copy short, warm, and unambiguous. The standard AI disclaimer is the
 * source of truth for the "AI is supportive, not a substitute" message.
 */

export type TrustVariant =
  | "ai"
  | "ai-inline"
  | "sharing"
  | "consent"
  | "document"
  | "resources"
  | "partners"
  | "admin-scope"
  | "student-voice";

type Spec = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const SPECS: Record<TrustVariant, Spec> = {
  ai: {
    icon: Sparkles,
    title: "AI-supported, human-led.",
    body: "AI recommendations are supportive planning tools and do not replace professional judgment, school team decisions, legal advice, or official IEP/PPT determinations. Always review with your student's team before acting.",
  },
  "ai-inline": {
    icon: Sparkles,
    title: "AI-generated suggestion.",
    body: "Supportive planning only — not a substitute for your IEP team, legal advice, or an official PPT decision.",
  },
  sharing: {
    icon: Users,
    title: "You decide who sees what.",
    body: "Only people you explicitly invite to this student can see this hub. Editors can update goals and documents; viewers can only read. You can change or remove access at any time from Trust & Consent.",
  },
  consent: {
    icon: ShieldCheck,
    title: "Your records are yours.",
    body: "Consent can be revoked any time. Revoking removes access going forward — it does not delete history that was already shared. Visit Trust & Consent for a full audit of links, collaborators, and consents.",
  },
  document: {
    icon: FileLock,
    title: "Documents are encrypted and scoped.",
    body: "IEPs and evaluations are stored encrypted and only visible to the people you've invited. Files are never used to train AI models. Delete a document any time from the student's hub.",
  },
  resources: {
    icon: Link2,
    title: "Curated, not endorsed.",
    body: "Resources are gathered to help your team plan. We don't control these third-party sites. Always confirm eligibility, cost, and current details directly with the provider before applying.",
  },
  partners: {
    icon: Building2,
    title: "Partner profiles are self-described.",
    body: "Partner organizations submit and maintain their own information. We review for safety, but inclusion isn't an endorsement. Confirm services, slots, and pricing directly with the partner.",
  },
  "admin-scope": {
    icon: Eye,
    title: "What admins can and can't see.",
    body: "Platform admins see system health and aggregate usage — not individual student records, IEPs, or family conversations. School and district admins only see students within their school or district scope.",
  },
  "student-voice": {
    icon: ShieldCheck,
    title: "Student Voice is the student's space.",
    body: "Responses are private to the student and the team they've chosen to share with. Educators and families can read entries the student has shared — never anything they haven't.",
  },
};

type Props = {
  variant: TrustVariant;
  /** Override title (rare). */
  title?: string;
  /** Override body copy (rare). */
  body?: string;
  /** "card" = full panel, "inline" = compact one-liner row, "banner" = wider. */
  display?: "card" | "inline" | "banner";
  className?: string;
};

export function TrustNote({
  variant,
  title,
  body,
  display = "card",
  className,
}: Props) {
  const spec = SPECS[variant];
  const Icon = spec.icon;
  const t = title ?? spec.title;
  const b = body ?? spec.body;

  if (display === "inline") {
    return (
      <p
        role="note"
        aria-label={t}
        className={cn(
          "inline-flex items-start gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <Icon className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" aria-hidden />
        <span>
          <span className="font-medium text-foreground">{t}</span> {b}
        </span>
      </p>
    );
  }

  const sized = display === "banner" ? "sm:p-5 sm:text-sm" : "";
  return (
    <aside
      role="note"
      aria-label={t}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground",
        sized,
        className,
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{t}</p>
        <p className="mt-1">{b}</p>
      </div>
    </aside>
  );
}
