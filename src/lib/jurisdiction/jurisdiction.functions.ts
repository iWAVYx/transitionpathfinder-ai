/**
 * Jurisdiction server functions.
 *
 * Reads the active versioned pack through a column-limited RPC. Anonymous
 * product surfaces can consume reviewed reference content without receiving
 * direct SELECT access to the underlying jurisdiction tables.
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
  .validator((data?: { code?: string }) => {
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

    const { data: packs, error } = await client.rpc("get_public_jurisdiction_pack", {
      _code: data.code,
    });
    const version = packs?.[0];

    if (error || !version) return CT_PACK;

    return {
      code: version.code,
      name: version.name,
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
        string | number | boolean | null
      >,
      agencies: (version.agencies ?? []) as unknown as JurisdictionAgency[],
      sources: (version.sources ?? []) as unknown as JurisdictionSource[],
    };
  });
