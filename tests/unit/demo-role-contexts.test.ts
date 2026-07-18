import { describe, expect, it } from "vitest";
import {
  SCHOOL_PROFILES,
  SCHOOL_PROFILE_ORDER,
  DISTRICT_PROFILES,
  DISTRICT_PROFILE_ORDER,
  PARTNER_PLANS,
  PARTNER_PLAN_ORDER,
  schoolTilesFor,
  districtTilesFor,
  partnerTilesFor,
} from "@/lib/demo/role-contexts";

describe("role-aware demo contexts", () => {
  it("provides exactly two school profiles (comprehensive + specialized)", () => {
    expect(SCHOOL_PROFILE_ORDER).toEqual(["comprehensive", "specialized"]);
    expect(SCHOOL_PROFILES.comprehensive.archetype).toBe("Comprehensive");
    expect(SCHOOL_PROFILES.specialized.archetype).toBe("Specialized");
  });

  it("provides exactly two district profiles (regional + local)", () => {
    expect(DISTRICT_PROFILE_ORDER).toEqual(["regional-network", "local-district"]);
    expect(DISTRICT_PROFILES["regional-network"].schools).toBeGreaterThan(
      DISTRICT_PROFILES["local-district"].schools,
    );
  });

  it("provides exactly two partner plans (free + premium)", () => {
    expect(PARTNER_PLAN_ORDER).toEqual(["free", "premium"]);
    expect(PARTNER_PLANS.free.label).toMatch(/free/i);
    expect(PARTNER_PLANS.premium.label).toMatch(/premium/i);
  });

  it("returns 4 tiles for every school / district / partner plan", () => {
    for (const id of SCHOOL_PROFILE_ORDER) {
      expect(schoolTilesFor(SCHOOL_PROFILES[id])).toHaveLength(4);
    }
    for (const id of DISTRICT_PROFILE_ORDER) {
      expect(districtTilesFor(DISTRICT_PROFILES[id])).toHaveLength(4);
    }
    for (const id of PARTNER_PLAN_ORDER) {
      expect(partnerTilesFor(PARTNER_PLANS[id])).toHaveLength(4);
    }
  });

  it("switching school changes all four tile values", () => {
    const a = schoolTilesFor(SCHOOL_PROFILES.comprehensive);
    const b = schoolTilesFor(SCHOOL_PROFILES.specialized);
    for (let i = 0; i < 4; i++) expect(a[i].value).not.toBe(b[i].value);
  });

  it("switching district changes all four tile values", () => {
    const a = districtTilesFor(DISTRICT_PROFILES["regional-network"]);
    const b = districtTilesFor(DISTRICT_PROFILES["local-district"]);
    for (let i = 0; i < 4; i++) expect(a[i].value).not.toBe(b[i].value);
  });

  it("premium plan expands opportunities/analytics vs free", () => {
    const free = partnerTilesFor(PARTNER_PLANS.free);
    const premium = partnerTilesFor(PARTNER_PLANS.premium);
    expect(free.map((t) => t.value)).not.toEqual(premium.map((t) => t.value));
  });
});
