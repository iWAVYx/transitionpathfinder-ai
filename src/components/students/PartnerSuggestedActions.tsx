import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HeartHandshake, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  matchPartnersForStudent,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import {useCreatePlanningAction} from "@/hooks/use-create-planning-action";
import {useAuth} from "@/hooks/use-auth";

/**
 * Auto-suggests action items from the student's top partner matches.
 * Each suggestion can be added as a real action item with one click.
 * Dismissed (or added) suggestions are hidden for the session.
 */
type SuggestedProps={studentId:string;onAdded?:()=>void};
export function PartnerSuggestedActions(props:SuggestedProps){
 const{user,loading}=useAuth();if(loading||!user)return null;
 return <PartnerSuggestedActionsSession key={`${user.id}:${props.studentId}`} {...props}/>;
}
function PartnerSuggestedActionsSession({studentId,onAdded}:SuggestedProps){
 const action=useCreatePlanningAction(studentId);
 const[loadError,setLoadError]=useState(false),[attempt,setAttempt]=useState(0);
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const [matches, setMatches] = useState<PartnerMatch[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);setMatches(null);
    fetchMatches({ data: { student_id: studentId, limit: 5 } })
      .then((r) => {
        if (!cancelled) setMatches(r.matches);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchMatches,attempt]);

  if(loadError)return <p role="status">Partner suggestions are unavailable. <Button size="sm" variant="outline" onClick={()=>setAttempt(n=>n+1)}>Refresh Suggestions</Button></p>;
  if (matches === null) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking for partner-based suggestions…
      </div>
    );
  }

  const visible = matches.filter((m) => !dismissed.has(m.partner_id));
  if (visible.length === 0) return null;

  async function onAdd(m: PartnerMatch) {
    if(action.pending||action.uncertain)return;
    setBusyId(m.partner_id);
    try {
      const title = `Reach out to ${m.organization_name}`;
      const description = `${m.suggested_next_step}${
        m.reasons.length ? `\n\nWhy: ${m.reasons.slice(0, 3).join("; ")}` : ""
      }${m.website_url ? `\n\nWebsite: ${m.website_url}` : ""}`;
      const saved=await action.run({
          student_id: studentId,
          title:title.slice(0,200),
          description:description.slice(0,2000),
          category: "family",
          priority: "medium",
      });
      if(!saved)return;
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(m.partner_id);
        return next;
      });
      toast.success("Added to action items");
      onAdded?.();
    } catch (err) {
      if(!action.current())return;
      toast.error(err instanceof Error ? err.message : "Could not add.");
    } finally {
      if(action.current())setBusyId(null);
    }
  }

  function onDismiss(partnerId: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(partnerId);
      return next;
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Suggested from partner network</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        One-click action items based on partners matched to this student.
      </p>
      {action.uncertain&&<p role="status" className="mt-2 text-sm">Check saved action items, then refresh this page before trying again.</p>}
      <ul className="mt-3 space-y-2">
        {visible.slice(0, 3).map((m) => (
          <li
            key={m.partner_id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Reach out to {m.organization_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {m.suggested_next_step}
              </p>
              {m.reasons.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Why: {m.reasons.slice(0, 2).join("; ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdd(m)}
                disabled={!action.available||!!busyId||action.pending||action.uncertain}
              >
                {busyId === m.partner_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Dismiss suggestion"
                onClick={() => onDismiss(m.partner_id)}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
