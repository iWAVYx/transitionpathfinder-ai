/**
 * Per-role demo context (school / district / partner plan).
 *
 * The Student, Family, and Educator roles use useDemoStudent for their
 * profile selector — this hook is intentionally scoped to the admin/partner
 * roles that must NOT show the Student Journey selector.
 *
 * Each role remembers its own most recently selected context in
 * localStorage under a distinct key, so switching roles restores prior
 * selections without leaking a student profile into an admin/partner view
 * or vice versa.
 */

import { useCallback, useEffect, useState } from "react";
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

function readStored<T extends string>(
  key: string,
  valid: readonly T[],
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return valid.includes(raw as T) ? (raw as T) : fallback;
}

export function useDemoSchool(): {
  school: SchoolProfile;
  schoolId: SchoolProfileId;
  setSchool: (id: SchoolProfileId) => void;
} {
  const [id, setId] = useState<SchoolProfileId>("comprehensive");
  useEffect(() => {
    setId(readStored<SchoolProfileId>(SCHOOL_KEY, ["comprehensive", "specialized"], "comprehensive"));
  }, []);
  const setSchool = useCallback((next: SchoolProfileId) => {
    setId(next);
    if (typeof window !== "undefined") window.localStorage.setItem(SCHOOL_KEY, next);
  }, []);
  return { school: SCHOOL_PROFILES[id], schoolId: id, setSchool };
}

export function useDemoDistrict(): {
  district: DistrictProfile;
  districtId: DistrictProfileId;
  setDistrict: (id: DistrictProfileId) => void;
} {
  const [id, setId] = useState<DistrictProfileId>("regional-network");
  useEffect(() => {
    setId(
      readStored<DistrictProfileId>(
        DISTRICT_KEY,
        ["regional-network", "local-district"],
        "regional-network",
      ),
    );
  }, []);
  const setDistrict = useCallback((next: DistrictProfileId) => {
    setId(next);
    if (typeof window !== "undefined") window.localStorage.setItem(DISTRICT_KEY, next);
  }, []);
  return { district: DISTRICT_PROFILES[id], districtId: id, setDistrict };
}

export function useDemoPartnerPlan(): {
  plan: PartnerPlan;
  planId: PartnerPlanId;
  setPlan: (id: PartnerPlanId) => void;
} {
  const [id, setId] = useState<PartnerPlanId>("free");
  useEffect(() => {
    setId(readStored<PartnerPlanId>(PLAN_KEY, ["free", "premium"], "free"));
  }, []);
  const setPlan = useCallback((next: PartnerPlanId) => {
    setId(next);
    if (typeof window !== "undefined") window.localStorage.setItem(PLAN_KEY, next);
  }, []);
  return { plan: PARTNER_PLANS[id], planId: id, setPlan };
}
