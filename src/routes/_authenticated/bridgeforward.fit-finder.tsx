import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  listHighSchoolOptions,
  upsertHighSchoolOption,
  deleteHighSchoolOption,
  getFitReview,
  upsertFitReview,
} from "@/lib/bridgeforward.functions";

export const Route = createFileRoute(
  "/_authenticated/bridgeforward/fit-finder",
)({
  head: () => ({ meta: [{ title: "High School Fit Finder — BridgeForward" }] }),
  component: () => (
    <RoleGuard path="/bridgeforward">
      <FitFinderPage />
    </RoleGuard>
  ),
});

type Option = {
  id?: string;
  student_id: string;
  school_name: string;
  option_type: string;
  pros?: string | null;
  cons?: string | null;
  support_services_notes?: string | null;
  transportation_notes?: string | null;
  notes?: string | null;
  rank?: number | null;
};

const OPTION_TYPES = [
  { v: "neighborhood", l: "Neighborhood" },
  { v: "magnet", l: "Magnet" },
  { v: "technical", l: "Technical" },
  { v: "charter", l: "Charter" },
  { v: "specialized", l: "Specialized" },
  { v: "alternative", l: "Alternative" },
  { v: "private_ood", l: "Private / Out-of-District" },
  { v: "district_program", l: "District Program" },
];

function FitFinderPage() {
  const loadStudents = useServerFn(listStudents);
  const loadOptions = useServerFn(listHighSchoolOptions);
  const saveOption = useServerFn(upsertHighSchoolOption);
  const removeOption = useServerFn(deleteHighSchoolOption);
  const loadReview = useServerFn(getFitReview);
  const saveReview = useServerFn(upsertFitReview);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [review, setReview] = useState({
    family_priorities: "",
    student_voice: "",
    questions_for_team: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadStudents().then(({ students }) => {
      setStudents(students);
      if (students[0]) setStudentId(students[0].id);
      else setLoading(false);
    });
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      loadOptions({ data: { studentId } }),
      loadReview({ data: { studentId } }),
    ])
      .then(([{ options }, { review }]) => {
        setOptions((options ?? []) as Option[]);
        setReview({
          family_priorities: review?.family_priorities ?? "",
          student_voice: review?.student_voice ?? "",
          questions_for_team: review?.questions_for_team ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [studentId, loadOptions, loadReview]);

  function addBlankOption() {
    setOptions((p) => [
      ...p,
      { student_id: studentId, school_name: "", option_type: "neighborhood" },
    ]);
  }

  async function persistOption(idx: number) {
    const o = options[idx];
    if (!o.school_name.trim()) {
      toast.error("Add a school name first");
      return;
    }
    setBusy(true);
    try {
      const { id } = await saveOption({
        data: {
          ...o,
          student_id: studentId,
          school_name: o.school_name.trim(),
          option_type: o.option_type as never,
        },
      });
      setOptions((p) => p.map((x, i) => (i === idx ? { ...x, id } : x)));
      toast.success("School option saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOption(idx: number) {
    const o = options[idx];
    if (o.id) {
      await removeOption({ data: { id: o.id } });
    }
    setOptions((p) => p.filter((_, i) => i !== idx));
  }

  async function saveReviewNow() {
    setBusy(true);
    try {
      await saveReview({
        data: {
          student_id: studentId,
          family_priorities: review.family_priorities || null,
          student_voice: review.student_voice || null,
          questions_for_team: review.questions_for_team || null,
        },
      });
      toast.success("Fit review saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (students.length === 0 && !loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs
            trail={[
              { label: "BridgeForward", to: "/bridgeforward" },
              { label: "Fit Finder" },
            ]}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Add a student first to compare high school options.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "BridgeForward", to: "/bridgeforward" },
            { label: "Fit Finder" },
          ]}
        />
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          High School Fit Finder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the schools you're considering. Compare what matters, then save
          what the family wants the team to know.
        </p>

        {students.length > 1 && (
          <div className="mt-6 max-w-xs">
            <Label htmlFor="student">Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="student" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {options.map((o, idx) => (
                <Card key={o.id ?? `new-${idx}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base">
                      Option #{idx + 1}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOption(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>School name</Label>
                      <Input
                        className="mt-1"
                        value={o.school_name}
                        onChange={(e) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx
                                ? { ...x, school_name: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={o.option_type}
                        onValueChange={(v) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, option_type: v } : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTION_TYPES.map((t) => (
                            <SelectItem key={t.v} value={t.v}>
                              {t.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Pros</Label>
                      <Textarea
                        className="mt-1 min-h-[60px]"
                        value={o.pros ?? ""}
                        onChange={(e) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, pros: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Cons / concerns</Label>
                      <Textarea
                        className="mt-1 min-h-[60px]"
                        value={o.cons ?? ""}
                        onChange={(e) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, cons: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Support services</Label>
                      <Textarea
                        className="mt-1 min-h-[48px]"
                        value={o.support_services_notes ?? ""}
                        onChange={(e) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    support_services_notes: e.target.value,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Transportation</Label>
                      <Textarea
                        className="mt-1 min-h-[48px]"
                        value={o.transportation_notes ?? ""}
                        onChange={(e) =>
                          setOptions((p) =>
                            p.map((x, i) =>
                              i === idx
                                ? { ...x, transportation_notes: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => persistOption(idx)}
                        disabled={busy}
                      >
                        Save option
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addBlankOption}>
                <Plus className="mr-1.5 h-4 w-4" /> Add a school
              </Button>
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-base">Fit review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>What matters most to the family</Label>
                  <Textarea
                    className="mt-1 min-h-[64px]"
                    value={review.family_priorities}
                    onChange={(e) =>
                      setReview((p) => ({
                        ...p,
                        family_priorities: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>What the student is saying</Label>
                  <Textarea
                    className="mt-1 min-h-[64px]"
                    value={review.student_voice}
                    onChange={(e) =>
                      setReview((p) => ({
                        ...p,
                        student_voice: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Questions for the receiving school team</Label>
                  <Textarea
                    className="mt-1 min-h-[64px]"
                    value={review.questions_for_team}
                    onChange={(e) =>
                      setReview((p) => ({
                        ...p,
                        questions_for_team: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveReviewNow} disabled={busy}>
                    Save review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SiteShell>
  );
}
