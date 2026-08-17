import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Tags applied by the CT seed expansion. Records touched by the import
// carry at least one of these in collection_tags.
const CT_SEED_TAGS = [
  // v1 tags
  "statewide_anchors",
  "ct_disability_providers",
  "dds_reimagining",
  "inclusive_employer_leads",
  "state_resources",
  "employer_leads",
  "dds_providers",
  "employment_pathways",
  "family_advocacy",
  // v2 tags (workforce/training/employer expansion)
  "ct_seed_v2",
  "free_ct_training",
  "youth_employment",
  "adult_education",
  "workforce_boards",
  "manufacturing_trades",
  "disability_employment",
  "employer_pipeline",
] as const;

export type ImportAuditPartner = {
  id: string;
  organization_name: string;
  partner_type: string | null;
  verification_status: string | null;
  partnership_status: string | null;
  outreach_status: string | null;
  city: string | null;
  county: string | null;
  collection_tags: string[];
  seed_tags_applied: string[];
  admin_notes: string | null;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  operation: "created" | "updated";
  created_at: string;
  updated_at: string;
};

export type ImportAuditOpportunity = {
  id: string;
  opportunity_title: string;
  opportunity_type: string | null;
  status: string | null;
  description: string | null;
  next_step: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_tags: string[];
  seed_tags_applied: string[];
  operation: "created" | "updated";
  created_at: string;
  updated_at: string;
};

export type ImportAuditResult = {
  is_admin: boolean;
  window: { since: string; tags: string[] };
  partners: ImportAuditPartner[];
  opportunities: ImportAuditOpportunity[];
  totals: {
    partners_total: number;
    partners_created: number;
    partners_updated: number;
    opportunities_total: number;
    opportunities_created: number;
    opportunities_updated: number;
  };
};

async function isPlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .maybeSingle();
  return Boolean(data);
}

// If updated_at is within ~2 minutes of created_at, treat as "created";
// otherwise it was an in-place tag/notes update by the seed import.
function classify(created_at: string, updated_at: string): "created" | "updated" {
  const c = new Date(created_at).getTime();
  const u = new Date(updated_at).getTime();
  return u - c < 120_000 ? "created" : "updated";
}

export const getImportAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        since: z.string().datetime().optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isPlatformAdmin(supabase, userId))) {
      return {
        is_admin: false,
        window: { since: "", tags: [...CT_SEED_TAGS] },
        partners: [],
        opportunities: [],
        totals: {
          partners_total: 0,
          partners_created: 0,
          partners_updated: 0,
          opportunities_total: 0,
          opportunities_created: 0,
          opportunities_updated: 0,
        },
      } satisfies ImportAuditResult;
    }

    const since = data.since ?? "2026-06-07T00:00:00Z";
    const tags = [...CT_SEED_TAGS];

    const { data: partners } = await supabase
      .from("partner_organizations")
      .select(
        "id, organization_name, partner_type, verification_status, partnership_status, outreach_status, city, county, collection_tags, admin_notes, last_reviewed_at, next_review_due_at, created_at, updated_at",
      )
      .overlaps("collection_tags", tags)
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(500);

    const seedSet = new Set<string>(CT_SEED_TAGS);
    const partnerRows: ImportAuditPartner[] = (partners ?? []).map((p: any) => {
      const ctags: string[] = p.collection_tags ?? [];
      return {
        id: p.id,
        organization_name: p.organization_name,
        partner_type: p.partner_type,
        verification_status: p.verification_status,
        partnership_status: p.partnership_status,
        outreach_status: p.outreach_status,
        city: p.city,
        county: p.county,
        collection_tags: ctags,
        seed_tags_applied: ctags.filter((t) => seedSet.has(t)),
        admin_notes: p.admin_notes,
        last_reviewed_at: p.last_reviewed_at,
        next_review_due_at: p.next_review_due_at,
        operation: classify(p.created_at, p.updated_at),
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    const partnerIdToName = new Map(partnerRows.map((p) => [p.id, p.organization_name]));
    const partnerIdToTags = new Map(partnerRows.map((p) => [p.id, p.collection_tags]));

    // Pull opportunities updated in the window for those partners (+ any in the window).
    const { data: opps } = await supabase
      .from("partner_network_opportunities")
      .select(
        "id, opportunity_title, opportunity_type, status, description, next_step, partner_id, created_at, updated_at",
      )
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(500);

    // Need partner names/tags for opps whose partner isn't in the partner rows.
    const missingIds = Array.from(
      new Set(
        (opps ?? [])
          .map((o: any) => o.partner_id)
          .filter((id: string | null): id is string => !!id && !partnerIdToName.has(id)),
      ),
    );
    if (missingIds.length) {
      const { data: extra } = await supabase
        .from("partner_organizations")
        .select("id, organization_name, collection_tags")
        .in("id", missingIds);
      for (const e of extra ?? []) {
        partnerIdToName.set(e.id, e.organization_name);
        partnerIdToTags.set(e.id, e.collection_tags ?? []);
      }
    }

    const oppRows: ImportAuditOpportunity[] = (opps ?? [])
      .map((o: any) => {
        const tagsForPartner: string[] = o.partner_id
          ? partnerIdToTags.get(o.partner_id) ?? []
          : [];
        return {
          id: o.id,
          opportunity_title: o.opportunity_title,
          opportunity_type: o.opportunity_type,
          status: o.status,
          description: o.description,
          next_step: o.next_step,
          partner_id: o.partner_id,
          partner_name: o.partner_id ? partnerIdToName.get(o.partner_id) ?? null : null,
          partner_tags: tagsForPartner,
          seed_tags_applied: tagsForPartner.filter((t) => seedSet.has(t)),
          operation: classify(o.created_at, o.updated_at) as "created" | "updated",
          created_at: o.created_at,
          updated_at: o.updated_at,
        };
      })
      // Only include opportunities tied to seed-tagged partners.
      .filter((o) => o.partner_tags.some((t) => (CT_SEED_TAGS as readonly string[]).includes(t)));

    return {
      is_admin: true,
      window: { since, tags },
      partners: partnerRows,
      opportunities: oppRows,
      totals: {
        partners_total: partnerRows.length,
        partners_created: partnerRows.filter((p) => p.operation === "created").length,
        partners_updated: partnerRows.filter((p) => p.operation === "updated").length,
        opportunities_total: oppRows.length,
        opportunities_created: oppRows.filter((o) => o.operation === "created").length,
        opportunities_updated: oppRows.filter((o) => o.operation === "updated").length,
      },
    } satisfies ImportAuditResult;
  });
