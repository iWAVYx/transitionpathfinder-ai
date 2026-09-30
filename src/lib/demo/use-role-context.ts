/**
 * Per-role demo context (school / district / partner plan).
 *
 * The Student, Family, and Educator roles use useDemoStudent for their
 * profile selector — this hook is intentionally scoped to the admin/partner
 * roles that must NOT show the Student Journey selector.
 *
 * IMPLEMENTATION NOTE — single source of truth
 * --------------------------------------------
 * Selector state MUST be shared across every consumer (selector pill,
 * dashboard grid, feature drawers, dedicated demo pages). Prior versions
 * held state in a per-component useState, so the selector's setter mutated
 * only its own instance and downstream consumers rendered stale data.
 *
 * We use a module-level store + useSyncExternalStore so every hook call
 * across the tree reads and reacts to the same value. localStorage supplies a default; URL parameters preserve each history entry.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  SCHOOL_PROFILES,
  DISTRICT_PROFILES,
  PARTNER_PLANS,
  type SchoolProfileId,
  type DistrictProfileId,
  type PartnerPlanId,
  type SchoolProfile,
  type DistrictProfile,
  type PartnerPlan,
} from "@/lib/demo/role-contexts";

const SCHOOL_KEY = "tf.demo.selectedSchool";
const DISTRICT_KEY = "tf.demo.selectedDistrict";
const PLAN_KEY = "tf.demo.selectedPartnerPlan";

const SCHOOL_IDS: readonly SchoolProfileId[] = ["comprehensive", "specialized"];
const DISTRICT_IDS: readonly DistrictProfileId[] = ["regional-network", "local-district"];
const PLAN_IDS: readonly PartnerPlanId[] = ["free", "premium"];

function createStore<T extends string>(key: string, valid: readonly T[], fallback: T) {
  let value: T = fallback;
  const listeners = new Set<() => void>();

  const readStored = (): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return valid.includes(raw as T) ? (raw as T) : fallback;
    } catch {
      return fallback;
    }
  };

  // Hydrate from localStorage once on the client so all consumers see the
  // same initial value; also listen for cross-tab updates.
  if (typeof window !== "undefined") {
    value = readStored();
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      const next = readStored();
      if (next !== value) {
        value = next;
        listeners.forEach((l) => l());
      }
    });
  }

  return {
    get: () => value,
    getServer: () => fallback,
    set: (next: T) => {
      if (!valid.includes(next) || next === value) return;
      value = next;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(key, next);
        } catch {
          /* optional storage */
        }
      }
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      // Re-sync on subscribe in case localStorage was hydrated before this
      // component mounted (SSR → client transition).
      if (typeof window !== "undefined") {
        const stored = readStored();
        if (stored !== value) {
          value = stored;
          l();
        }
      }
      return () => {
        listeners.delete(l);
      };
    },
  };
}

const schoolStore = createStore<SchoolProfileId>(SCHOOL_KEY, SCHOOL_IDS, "comprehensive");
const districtStore = createStore<DistrictProfileId>(
  DISTRICT_KEY,
  DISTRICT_IDS,
  "regional-network",
);
const planStore = createStore<PartnerPlanId>(PLAN_KEY, PLAN_IDS, "free");

function useHistoryContext<T extends string>(
  store: ReturnType<typeof createStore<T>>,
  valid: readonly T[],
  parameter: string,
  role: string,
) {
  const stored = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const search = location.search as Record<string, unknown>;
  const raw = search[parameter];
  const active =
    location.pathname === `/demo/${role}` || location.pathname.startsWith(`/demo/feature/${role}/`);
  const explicit = typeof raw === "string" && valid.includes(raw as T);
  const id = active && explicit ? (raw as T) : stored;
  useEffect(() => {
    if (!active) return;
    if (explicit) {
      store.set(id);
      return;
    }
    // Pin legacy links before a later choice can alter their history context.
    void navigate({
      to: location.pathname,
      hash: location.hash,
      search: (previous: Record<string, unknown>) => ({ ...previous, [parameter]: id }),
      replace: true,
      resetScroll: false,
    });
  }, [active, explicit, id, location.pathname, location.hash, navigate, parameter, store]);
  const set = useCallback(
    (next: T) => {
      if (!valid.includes(next)) return;
      if (!active) {
        store.set(next);
        return;
      }
      void navigate({
        to: location.pathname,
        hash: location.hash,
        search: (previous: Record<string, unknown>) => ({ ...previous, [parameter]: next }),
        resetScroll: false,
      });
    },
    [active, location.pathname, location.hash, navigate, parameter, store, valid],
  );
  return [id, set] as const;
}

export function useDemoSchool(): {
  school: SchoolProfile;
  schoolId: SchoolProfileId;
  setSchool: (id: SchoolProfileId) => void;
} {
  const [id, setSchool] = useHistoryContext(schoolStore, SCHOOL_IDS, "school", "school-admin");
  return { school: SCHOOL_PROFILES[id], schoolId: id, setSchool };
}

export function useDemoDistrict(): {
  district: DistrictProfile;
  districtId: DistrictProfileId;
  setDistrict: (id: DistrictProfileId) => void;
} {
  const [id, setDistrict] = useHistoryContext(
    districtStore,
    DISTRICT_IDS,
    "district",
    "district-admin",
  );
  return { district: DISTRICT_PROFILES[id], districtId: id, setDistrict };
}

export function useDemoPartnerPlan(): {
  plan: PartnerPlan;
  planId: PartnerPlanId;
  setPlan: (id: PartnerPlanId) => void;
} {
  const [id, setPlan] = useHistoryContext(planStore, PLAN_IDS, "plan", "partner");
  return { plan: PARTNER_PLANS[id], planId: id, setPlan };
}
