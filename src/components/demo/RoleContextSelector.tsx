/**
 * RoleContextSelector — renders the correct demo context selector for the
 * current role.
 *
 * - Student / Family / Educator → Student Journey selector (StudentSwitcher)
 * - School Admin              → School Profile selector (2 schools)
 * - District Admin            → District Profile selector (2 districts)
 * - Partner                   → Listing Plan selector (Free / Premium)
 * - Owner                     → (no selector — Admin Hub is preserved)
 *
 * All variants use the same compact pill + dropdown chrome as StudentSwitcher
 * so the demo header rhythm stays identical across roles.
 */

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import type { DemoRoleId } from "@/lib/demo/role-previews";
import {
  SCHOOL_PROFILES,
  SCHOOL_PROFILE_ORDER,
  DISTRICT_PROFILES,
  DISTRICT_PROFILE_ORDER,
  PARTNER_PLANS,
  PARTNER_PLAN_ORDER,
} from "@/lib/demo/role-contexts";
import {
  useDemoSchool,
  useDemoDistrict,
  useDemoPartnerPlan,
} from "@/lib/demo/use-role-context";

const STUDENT_ROLES: DemoRoleId[] = ["student", "family", "educator"];

export function RoleContextSelector({
  role,
  compact = false,
}: {
  role: DemoRoleId;
  compact?: boolean;
}) {
  if (STUDENT_ROLES.includes(role)) {
    return <StudentSwitcher compact={compact} />;
  }
  if (role === "school-admin") return <SchoolPicker />;
  if (role === "district-admin") return <DistrictPicker />;
  if (role === "partner") return <PartnerPlanPicker />;
  return null; // owner and any future role — no selector
}

function PillDropdown({
  label,
  emoji,
  title,
  subtitle,
  ariaLabel,
  children,
}: {
  label: string;
  emoji: string;
  title: string;
  subtitle?: string;
  ariaLabel: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/10"
      >
        <span aria-hidden className="text-base leading-none">{emoji}</span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {title}
            {subtitle && (
              <span className="ml-1.5 hidden font-normal text-muted-foreground sm:inline">
                · {subtitle}
              </span>
            )}
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          <ul className="space-y-1">{children(() => setOpen(false))}</ul>
          <p className="mt-2 border-t border-border/60 px-2 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            Fictional demo context. No real organizations or subscriptions.
          </p>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  active,
  emoji,
  title,
  tagline,
  meta,
  onSelect,
}: {
  active: boolean;
  emoji: string;
  title: string;
  tagline: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
          active ? "bg-primary/10 text-foreground" : "hover:bg-muted"
        }`}
      >
        <span aria-hidden className="mt-0.5 text-xl leading-none">{emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tagline}</span>
          {meta && (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">{meta}</span>
          )}
        </span>
        {active && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
      </button>
    </li>
  );
}

function SchoolPicker() {
  const { school, schoolId, setSchool } = useDemoSchool();
  return (
    <PillDropdown
      label="Demo school"
      emoji={school.emoji}
      title={school.shortName}
      subtitle={school.archetype}
      ariaLabel={`Demo school: ${school.displayName}. Change school.`}
    >
      {(close) =>
        SCHOOL_PROFILE_ORDER.map((id) => {
          const s = SCHOOL_PROFILES[id];
          return (
            <OptionRow
              key={id}
              active={id === schoolId}
              emoji={s.emoji}
              title={s.displayName}
              tagline={s.tagline}
              meta={`${s.enrollment.toLocaleString()} enrolled · ${s.iepCaseload} on IEPs`}
              onSelect={() => {
                setSchool(id);
                close();
              }}
            />
          );
        })
      }
    </PillDropdown>
  );
}

function DistrictPicker() {
  const { district, districtId, setDistrict } = useDemoDistrict();
  return (
    <PillDropdown
      label="Demo district"
      emoji={district.emoji}
      title={district.shortName}
      subtitle={district.archetype}
      ariaLabel={`Demo district: ${district.displayName}. Change district.`}
    >
      {(close) =>
        DISTRICT_PROFILE_ORDER.map((id) => {
          const d = DISTRICT_PROFILES[id];
          return (
            <OptionRow
              key={id}
              active={id === districtId}
              emoji={d.emoji}
              title={d.displayName}
              tagline={d.tagline}
              meta={`${d.schools} schools · ${d.enrollment.toLocaleString()} students`}
              onSelect={() => {
                setDistrict(id);
                close();
              }}
            />
          );
        })
      }
    </PillDropdown>
  );
}

function PartnerPlanPicker() {
  const { plan, planId, setPlan } = useDemoPartnerPlan();
  return (
    <PillDropdown
      label="Listing plan"
      emoji={plan.emoji}
      title={plan.label}
      ariaLabel={`Demo listing plan: ${plan.label}. Change plan.`}
    >
      {(close) =>
        PARTNER_PLAN_ORDER.map((id) => {
          const p = PARTNER_PLANS[id];
          return (
            <OptionRow
              key={id}
              active={id === planId}
              emoji={p.emoji}
              title={p.label}
              tagline={p.tagline}
              onSelect={() => {
                setPlan(id);
                close();
              }}
            />
          );
        })
      }
    </PillDropdown>
  );
}
