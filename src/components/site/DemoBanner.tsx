import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

/**
 * Global banner shown whenever the signed-in user is a demo account
 * (profiles.is_demo = true). Makes it impossible to confuse demo data
 * with real data during walkthroughs.
 */
export function DemoBanner() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["demo-banner", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_demo")
        .eq("id", userId!)
        .maybeSingle();
      return data?.is_demo === true;
    },
  });

  if (!data) return null;

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
      <div className="container flex items-center justify-center gap-2 py-1.5 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5" />
        DEMO ACCOUNT — sample data only. Nothing here represents a real student or family.
      </div>
    </div>
  );
}
