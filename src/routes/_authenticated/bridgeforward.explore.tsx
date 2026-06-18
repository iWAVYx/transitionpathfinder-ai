import { createFileRoute, Link } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  searchSchoolsForStudent,
  saveSchoolMatch,
  listSavedMatches,
} from "@/lib/bridgeforward-schools.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bridgeforward/explore")({
  head: () => ({ meta: [{ title: "Explore High Schools — BridgeForward" }] }),
  component: withRoleGuard(["family", "educator", "student", "admin"], ExplorePage),
});

function ExplorePage() {
  const [studentId, setStudentId] = useState<string>("");
  const [students, setStudents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const search = useServerFn(searchSchoolsForStudent);
  const save = useServerFn(saveSchoolMatch);
  const savedFn = useServerFn(listSavedMatches);
  const qc = useQueryClient();

  // Load students the user can access (RLS-scoped)
  useState(() => {
    supabase
      .from("students")
      .select("id, first_name, last_name, grade_band")
      .order("first_name")
      .then(({ data }) => {
        const list = (data ?? []) as any[];
        setStudents(list);
        if (!studentId && list[0]) setStudentId(list[0].id);
      });
    return undefined;
  });

  const matches = useQuery({
    queryKey: ["bf-matches", studentId],
    queryFn: () => search({ data: { studentId } }),
    enabled: !!studentId,
  });

  const saved = useQuery({
    queryKey: ["bf-saved", studentId],
    queryFn: () => savedFn({ data: { studentId } }),
    enabled: !!studentId,
  });

  const saveMutation = useMutation({
    mutationFn: (m: any) =>
      save({
        data: {
          student_id: studentId,
          school_id: m.school.id,
          program_id: m.program?.id ?? null,
          reasons: m.reasons,
          student_factors: m.student_factors,
          questions_to_ask: m.questions_to_ask,
          needs_review: m.needs_review,
          score: m.score,
        },
      }),
    onSuccess: () => {
      toast.success("Saved for review with your team.");
      qc.invalidateQueries({ queryKey: ["bf-saved", studentId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save."),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs trail={[{ label: "BridgeForward", to: "/bridgeforward" }, { label: "Explore High Schools" }]} />
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">Explore High Schools</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Possible-fit suggestions based on the student's BridgeForward profile. These are for planning conversations — not placement decisions. Always review with your school team.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm">Student:</span>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm"><Link to="/bridgeforward/intake">Update Profile</Link></Button>
        </div>

        {!studentId && <p className="mt-8 text-sm text-muted-foreground">Connect a grade 6–8 student to begin.</p>}

        {studentId && matches.isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading suggestions…</p>}

        {studentId && matches.data?.needsProfile && (
          <Card className="mt-8"><CardContent className="pt-6 text-sm">
            {matches.data.message} <Link to="/bridgeforward/intake" className="text-primary underline">Open profile</Link>.
          </CardContent></Card>
        )}

        {!matches.isLoading && !matches.data?.needsProfile && (matches.data?.matches.length ?? 0) === 0 && studentId && (
          <p className="mt-8 text-sm text-muted-foreground">No suggestions yet — add a few interests and supports to the profile.</p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {matches.data?.matches?.map((m, i) => (
            <Card key={`${m.school.id}-${m.program?.id ?? "none"}-${i}`}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{m.school.school_type.replace(/_/g, " ")}</Badge>
                  {m.school.city && <span className="text-xs text-muted-foreground">{m.school.city}</span>}
                </div>
                <CardTitle className="mt-2 text-base">
                  {m.school.name}
                  {m.program && <span className="block text-sm font-normal text-muted-foreground">{m.program.program_name}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">Why this may be worth exploring</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {m.reasons.map((r, j) => <li key={j}>{r}</li>)}
                  </ul>
                </div>
                {m.student_factors.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Student information that influenced this</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      {m.student_factors.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">Questions to ask</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {m.questions_to_ask.map((r, j) => <li key={j}>{r}</li>)}
                  </ul>
                </div>
                {m.needs_review.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground">Still needs review</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                      {m.needs_review.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                )}
                <p className="rounded-md bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Discuss with your PPT or school transition team before applying.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveMutation.mutate(m)} disabled={saveMutation.isPending}>
                    Save for Review
                  </Button>
                  {m.school.website_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={m.school.website_url} target="_blank" rel="noopener noreferrer">School Site</a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(saved.data?.matches?.length ?? 0) > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl">Saved Matches</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(saved.data?.matches ?? []).map((m: any) => (
                <Card key={m.id}>
                  <CardHeader><CardTitle className="text-sm">{m.school?.name}{m.program ? ` · ${m.program.program_name}` : ""}</CardTitle></CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Saved {new Date(m.created_at).toLocaleDateString()}</CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
