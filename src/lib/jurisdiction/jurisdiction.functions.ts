/**
 * Jurisdiction server functions.
 *
 * Reads the active versioned pack for a jurisdiction. Packs are public
 * reference content, so this uses a publishable-key client and the narrow
 * public SELECT policies on the jurisdiction tables.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  CT_PACK,
  DEFAULT_JURISDICTION,
  type JurisdictionAgency,
  type JurisdictionPack,
  type JurisdictionPlanningRules,
  type JurisdictionSource,
  type JurisdictionTerminology,
} from "@/lib/jurisdiction/config";

const CODE_RE = /^[A-Z]{2}-[A-Z]{2}$/;

export const getJurisdictionPack = createServerFn({ method: "GET" })
  .inputValidator((data?: { code?: string }) => {
    const code = data?.code ?? DEFAULT_JURISDICTION;
    if (!CODE_RE.test(code)) throw new Error("Invalid jurisdiction code");
    return { code };
  })
  .handler(async ({ data }): Promise<JurisdictionPack> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return CT_PACK;

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: version } = await client
      .from("jurisdiction_versions")
      .select(
        "id, version, effective_from, review_due, terminology, planning_rules, role_labels, privacy_requirements, jurisdictions(name)",
      )
      .eq("jurisdiction_code", data.code)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!version) return CT_PACK;

    const [{ data: agencies }, { data: sources }] = await Promise.all([
      client
        .from("jurisdiction_agencies")
        .select("name, kind, url, description")
        .eq("version_id", version.id)
        .order("sort_order", { ascending: true }),
      client
        .from("jurisdiction_sources")
        .select("title, url, publisher, last_verified_at")
        .eq("version_id", version.id),
    ]);

    const name =
      (version as unknown as { jurisdictions?: { name?: string } | null })
        .jurisdictions?.name ?? CT_PACK.name;

    return {
      code: data.code,
      name,
      version: version.version as number,
      effectiveFrom: version.effective_from as string,
      reviewDue: (version.review_due as string | null) ?? null,
      terminology: {
        ...CT_PACK.terminology,
        ...((version.terminology ?? {}) as Partial<JurisdictionTerminology>),
      },
      planningRules: {
        ...CT_PACK.planningRules,
        ...((version.planning_rules ?? {}) as Partial<JurisdictionPlanningRules>),
      },
      roleLabels: {
        ...CT_PACK.roleLabels,
        ...((version.role_labels ?? {}) as Record<string, string>),
      },
      privacyRequirements: (version.privacy_requirements ?? {}) as Record<
        string,
        unknown
      >,
      agencies: (agencies ?? []) as unknown as JurisdictionAgency[],
      sources: (sources ?? []) as unknown as JurisdictionSource[],
    };
  });
