import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabasePublicServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!supabasePublishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `Missing public Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`,
    );
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let publicServerClient: ReturnType<typeof createSupabasePublicServerClient> | undefined;

/**
 * Anonymous server client for content already protected by public SELECT RLS.
 * This deliberately cannot bypass RLS and never requires a service-role key.
 */
export const supabasePublic = new Proxy({} as ReturnType<typeof createSupabasePublicServerClient>, {
  get(_, prop, receiver) {
    publicServerClient ??= createSupabasePublicServerClient();
    return Reflect.get(publicServerClient, prop, receiver);
  },
});
