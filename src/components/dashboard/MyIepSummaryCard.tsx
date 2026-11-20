import { useAuth } from "@/hooks/use-auth";
import { STUDENT_SUMMARY_MESSAGE } from "@/lib/student-summary-contract";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Sparkles } from "lucide-react";
import {
  getStudentFriendlyDocumentSummary,
  listStudentFriendlyDocuments,
  type StudentFriendlySummary,
} from "@/lib/student-access.functions";

type Props = { studentId: string; audience?: "student" | "team" };

/**
 * Student-facing IEP summary card. Pulls only the plain-language sections
 * from the latest extraction of an IEP / transition-plan document the student
 * has access to. If extraction isn't ready or nothing is shared, shows a
 * friendly "your team is preparing this" message instead of hiding the entry.
 */
export function MyIepSummaryCard({studentId,audience="student"}:Props){
  const {user,loading}=useAuth();
  if(loading||!user)return null;
  return <StudentSummarySession key={`${user.id}:${studentId}`} studentId={studentId} viewerId={user.id} audience={audience}/>;
}
function StudentSummarySession({studentId,viewerId,audience="student"}:Props&{viewerId:string}){
  const listFn=useServerFn(listStudentFriendlyDocuments),summaryFn=useServerFn(getStudentFriendlyDocumentSummary);
  const active=useRef(false),pending=useRef(false);
  const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
  const [summary,setSummary]=useState<StudentFriendlySummary|null>(null),[docTitle,setDocTitle]=useState<string|null>(null),[hasDocs,setHasDocs]=useState(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function load(){
    if(pending.current)return;pending.current=true;setLoading(true);setFailed(false);setSummary(null);setDocTitle(null);setHasDocs(false);
    try{
      const list=await listFn({data:{student_id:studentId,expected_viewer_id:viewerId}});
      if(!active.current)return;
      setHasDocs(list.documents.length>0);const first=list.documents[0];
      if(!first)return;setDocTitle(first.title);
      if(first.summary_ready){
        const result=await summaryFn({data:{student_id:studentId,expected_viewer_id:viewerId,document_id:first.id,expected_document_updated_at:first.document_updated_at,expected_extraction_updated_at:first.extraction_updated_at}});
        if(!active.current)return;
        if(result.summary.document_id!==first.id||!result.summary.ready||result.summary.sections.length===0||result.summary.sections.some(section=>section.accepted!==true))throw new Error();
        setSummary(result.summary);
      }
    }catch{if(active.current){setFailed(true);setSummary(null);setDocTitle(null);}}
    finally{pending.current=false;if(active.current)setLoading(false);}
  }
  // Viewer/student changes remount this session; stable server functions restart reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{load();},[listFn,summaryFn]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl">{audience === "team" ? "Reviewed IEP Summary" : "Your IEP Summary"}</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-foreground/75">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : failed ? (
        <div role="alert" className="space-y-2 text-sm text-foreground/75"><p>{STUDENT_SUMMARY_MESSAGE}</p><Button size="sm" onClick={load}>Refresh Summary</Button></div>
      ) : !hasDocs ? (
        <p className="text-sm text-foreground/75">
          {audience === "team" ? "No IEP summaries are available for this student yet. Reviewed strengths, supports and goals will appear here once the team has checked them." : "No IEP summary is available yet. When your team shares reviewed information, you'll see your strengths, supports and goals here."}
        </p>
      ) : !summary ? (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium">No Reviewed Summary Yet</p>
          {docTitle && <p className="mt-1 text-xs text-foreground/75">From: {docTitle}</p>}
          <p className="mt-2 text-xs text-foreground/75">
            Reviewed strengths, supports and goals will appear here when the student's team chooses information to share.
          </p>
        </div>
      ) : summary.sections.length === 0 ? (
        <p className="text-sm text-foreground/75">
          Your team has shared an IEP, but a student-friendly summary hasn't been written yet.
          Ask your case manager to walk through it with you.
        </p>
      ) : (
        <>
          {docTitle && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-foreground/75">
              <Sparkles className="h-3 w-3" /> From {docTitle}
            </p>
          )}
          <ul className="space-y-3">
            {summary.sections.slice(0, 6).map((s) => (
              <li key={s.key} className="rounded-xl border bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
                  {s.label}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{s.value}</p>

              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-foreground/75">
            This is a planning summary to help you understand your IEP. It does not replace the
            official IEP from your school team.
          </p>
        </>
      )}
    </section>
  );
}
