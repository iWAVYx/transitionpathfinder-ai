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
 * across the tree reads and reacts to the same value. localStorage keeps
 * the selection sticky across refresh / back / forward.
 */

import { useCallback, useSyncExternalStore } from "react";
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

function createStore<T extends string>(
  key: string,
  valid: readonly T[],
  fallback: T,
) {
  let value: T = fallback;
  const listeners = new Set<() => void>();

  const readStored = (): T => {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return valid.includes(raw as T) ? (raw as T) : fallback;
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
      if (typeof window !== "undefined") window.localStorage.setItem(key, next);
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
const districtStore = createStore<DistrictProfileId>(DISTRICT_KEY, DISTRICT_IDS, "regional-network");
const planStore = createStore<PartnerPlanId>(PLAN_KEY, PLAN_IDS, "free");

export function useDemoSchool(): {
  school: SchoolProfile;
  schoolId: SchoolProfileId;
  setSchool: (id: SchoolProfileId) => void;
} {
  const id = useSyncExternalStore(schoolStore.subscribe, schoolStore.get, schoolStore.getServer);
  const setSchool = useCallback((next: SchoolProfileId) => schoolStore.set(next), []);
  return { school: SCHOOL_PROFILES[id], schoolId: id, setSchool };
}

export function useDemoDistrict(): {
  district: DistrictProfile;
  districtId: DistrictProfileId;
  setDistrict: (id: DistrictProfileId) => void;
} {
  const id = useSyncExternalStore(districtStore.subscribe, districtStore.get, districtStore.getServer);
  const setDistrict = useCallback((next: DistrictProfileId) => districtStore.set(next), []);
  return { district: DISTRICT_PROFILES[id], districtId: id, setDistrict };
}

export function useDemoPartnerPlan(): {
  plan: PartnerPlan;
  planId: PartnerPlanId;
  setPlan: (id: PartnerPlanId) => void;
} {
  const id = useSyncExternalStore(planStore.subscribe, planStore.get, planStore.getServer);
  const setPlan = useCallback((next: PartnerPlanId) => planStore.set(next), []);
  return { plan: PARTNER_PLANS[id], planId: id, setPlan };
}
