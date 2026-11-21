import { useAuth } from "@/hooks/use-auth";
import { DOCUMENT_METADATA_MESSAGE } from "@/lib/document-metadata-contract";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Tag } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DOC_TYPES,
  classifyDocument,
  getDocumentMeta,
  markDocumentReviewed,
  type DocType,
  type DocumentMetaRow,
} from "@/lib/documents.functions";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  "iep": "IEP",
  "current-iep": "Current IEP",
  "previous-iep": "Previous IEP",
  "evaluation": "Evaluation",
  "transition-plan": "Transition Plan",
  "progress-report": "Progress Report",
  "meeting-notes": "Meeting Notes",
  "other": "Other",
};

type Props={documentId:string;className?:string;disabled?:boolean};
export function DocumentClassificationCard(props:Props){
  const {user,loading}=useAuth();
  if(loading||!user)return null;
  return <DocumentClassificationSession key={`${user.id}:${props.documentId}`} {...props} viewerId={user.id}/>;
}
function DocumentClassificationSession({documentId,className,disabled=false,viewerId}:Props&{viewerId:string}){
  const active=useRef(false),pending=useRef(false),readGeneration=useRef(0);
  const [unconfirmed,setUnconfirmed]=useState(false),[loadError,setLoadError]=useState(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const fnGet = useServerFn(getDocumentMeta);
  const fnClassify = useServerFn(classifyDocument);
  const fnReview = useServerFn(markDocumentReviewed);

  const [meta, setMeta] = useState<DocumentMetaRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload(){
    if(pending.current)return;
    const generation=++readGeneration.current;setLoadError(false);
    try {
      const row=await fnGet({data:{document_id:documentId,expected_viewer_id:viewerId}});
      if(!active.current||generation!==readGeneration.current)return;
      if(row.id!==documentId)throw new Error();
      setMeta(row);setUnconfirmed(false);
    } catch {if(active.current&&generation===readGeneration.current){setMeta(null);setLoadError(true);}}
  }
  useEffect(()=>{reload();},[documentId,fnGet]);
  async function save(kind:"classify"|"review",value?:DocType){
    if(!active.current||!meta||pending.current||unconfirmed||disabled||!meta.can_edit)return;
    pending.current=true;setSaving(true);
    const identity={id:documentId,student_id:meta.student_id,expected_viewer_id:viewerId,expected_updated_at:meta.updated_at};
    try {
      const row=kind==="classify"?await fnClassify({data:{...identity,doc_type:value!}}):await fnReview({data:{...identity,reviewed:!meta.reviewed_at}});
      if(!active.current)return;
      if(row.id!==documentId||row.student_id!==meta.student_id||row.updated_at===meta.updated_at)throw new Error();
      setMeta(row);toast.success(kind==="classify"?"Document type updated.":row.reviewed_at?"Marked as reviewed.":"Review cleared.");
    } catch {if(active.current){setUnconfirmed(true);toast.error(DOCUMENT_METADATA_MESSAGE);}}
    finally {pending.current=false;if(active.current)setSaving(false);}
  }
  const blocked=saving||unconfirmed||disabled||!meta?.can_edit;
  if(!meta)return loadError?<Card className={className}><CardContent className="space-y-2 p-4"><p role="alert" className="text-sm">{DOCUMENT_METADATA_MESSAGE}</p><Button size="sm" onClick={reload}>Refresh Details</Button></CardContent></Card>:null;

  const reviewed = !!meta.reviewed_at;
  const usedInReport = !!meta.used_in_report_at;

  return (
    <Card className={className} data-testid="document-classification-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" /> Classification & Review
        </CardTitle>
        <CardDescription>
          Categorize this document and mark it reviewed once you have looked it over. Reviewed
          documents can inform the student's Pathway Report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unconfirmed&&<div role="alert" className="space-y-2 text-sm"><p>{DOCUMENT_METADATA_MESSAGE}</p><Button size="sm" onClick={reload}>Refresh Details</Button></div>}
        {!meta.can_edit&&<p className="text-sm text-muted-foreground">{meta.archived_at?"This document is archived; its details are read-only.":"These details are read-only. Editing requires current student-team editing access."}</p>}
        <div>
          <Label htmlFor="doc-type-select" className="text-xs uppercase tracking-wider text-muted-foreground">
            Document Type
          </Label>
          <select
            id="doc-type-select"
            data-testid="doc-type-select"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={meta.doc_type}
            disabled={blocked}
            onChange={(e) => {if(e.target.value!==meta.doc_type)save("classify",e.target.value as DocType);}}
          >
            {!DOC_TYPES.includes(meta.doc_type as DocType)&&<option value={meta.doc_type}>Other (Existing Type)</option>}
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {reviewed ? (
            <Badge variant="secondary" className="gap-1" data-testid="reviewed-badge">
              <CheckCircle2 className="h-3 w-3" />
              Reviewed {new Date(meta.reviewed_at as string).toLocaleDateString()}
            </Badge>
          ) : (
            <Badge variant="outline" data-testid="unreviewed-badge">Not yet reviewed</Badge>
          )}
          {usedInReport && (
            <Badge variant="secondary" data-testid="used-in-report-badge">
              Used in Pathway Report
            </Badge>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant={reviewed ? "outline" : "default"}
          onClick={()=>save("review")}
          disabled={blocked}
          data-testid="toggle-reviewed-btn"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : reviewed ? (
            "Clear reviewed"
          ) : (
            "Mark reviewed"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
