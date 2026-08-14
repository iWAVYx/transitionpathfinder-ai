import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// SECURITY (Phase 2): These are public read-only endpoints. They previously
// used the service-role client, which bypasses RLS entirely. Now they use a
// publishable-key client constrained by narrow `TO anon` SELECT policies
// (published/featured/approved resources; non-archived resource_sources).
// See migration: "Public reads published resources" / "Public reads non-archived sources".
let _supabasePublic: ReturnType<typeof createClient<Database>> | undefined;
function getPublic() {
  if (!_supabasePublic) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not configured.");
    }
    _supabasePublic = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabasePublic;
}

export type DbResource = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  audience: string;
  topic: string | null;
  format: string | null;
  url: string | null;
  source_name: string | null;
  source_id: string | null;
  location_scope: string;
  estimated_time: string | null;
  grade_range: string | null;
  featured: boolean;
  published_status: string;
  role_relevance: string[] | null;
  pathway_relevance: string[] | null;
};

const RESOURCE_COLS =
  "id,title,description,resource_type,audience,topic,format,url,source_name,source_id,location_scope,estimated_time,grade_range,featured,published_status,role_relevance,pathway_relevance";

export const listVerifiedResources = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await getPublic()
      .from("resources")
      .select(RESOURCE_COLS)
      .in("published_status", ["published", "featured", "approved"])
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("listVerifiedResources failed", error);
      return { resources: [] as DbResource[] };
    }
    return { resources: (data ?? []) as unknown as DbResource[] };
  });

export const listFeaturedResources = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await getPublic()
      .from("resources")
      .select(RESOURCE_COLS)
      .eq("featured", true)
      .in("published_status", ["published", "featured", "approved"])
      .order("updated_at", { ascending: false })
      .limit(24);
    if (error) return { resources: [] as DbResource[] };
    return { resources: (data ?? []) as unknown as DbResource[] };
  });

export type ResourceSourcePublic = {
  id: string;
  source_name: string;
  source_url: string | null;
  organization_name: string | null;
  description: string | null;
  source_type: string;
  audience_focus: string[];
  topic_focus: string[];
  location_scope: string;
  review_status: string;
  last_reviewed_at: string | null;
  resource_count: number;
};

export const listSourceLibraries = createServerFn({ method: "GET" })
  .handler(async () => {
    const client = getPublic();
    const { data: sources, error } = await (client as any).rpc(
      "list_public_resource_sources",
    );

    if (error || !sources) return { sources: [] as ResourceSourcePublic[] };

    // Count published resources per source
    const ids = sources.map((s: { id: string }) => s.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: rows } = await client
        .from("resources")
        .select("source_id")
        .in("source_id", ids)
        .in("published_status", ["published", "featured", "approved"]);
      for (const r of (rows ?? []) as Array<{ source_id: string | null }>) {
        if (r.source_id) counts.set(r.source_id, (counts.get(r.source_id) ?? 0) + 1);
      }
    }
    const out: ResourceSourcePublic[] = sources.map((s: any) => ({
      ...s,
      resource_count: counts.get(s.id) ?? 0,
    }));
    return { sources: out };
  });
