import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { listStudents, type Student } from "@/lib/students.functions";
import {
  getBridgeforwardProfile,
  upsertBridgeforwardProfile,
} from "@/lib/bridgeforward.functions";
import { ExtractEvidenceButton } from "@/components/pathway/ExtractEvidenceButton";

export const Route = createFileRoute("/_authenticated/bridgeforward/intake")({
  head: () => ({
    meta: [{ title: "BridgeForward Profile — Intake" }],
  }),
  component: () => (
    <RoleGuard path="/bridgeforward">
      <IntakePage />
    </RoleGuard>
  ),
});

type Form = Record<string, string | number | null>;

const FIELDS: Array<{
  key: string;
  label: string;
  helper?: string;
  long?: boolean;
}> = [
  { key: "current_school", label: "Current school" },
  { key: "district", label: "District" },
  { key: "interests", label: "Interests and hobbies", long: true },
  { key: "favorite_subjects", label: "Favorite or strongest subjects" },
  { key: "subjects_needing_support", label: "Subjects that need extra support" },
  { key: "learning_strengths", label: "Learning strengths", long: true },
  { key: "learning_challenges", label: "Learning challenges", long: true },
  {
    key: "executive_functioning_needs",
    label: "Executive functioning needs",
    helper: "Organization, time management, focus, transitions…",
    long: true,
  },
  {
    key: "social_emotional_support_needs",
    label: "Social / emotional support needs",
    long: true,
  },
  { key: "current_supports", label: "Current supports & accommodations", long: true },
  { key: "extracurricular_interests", label: "Clubs, sports, or activities", long: true },
  {
    key: "preferred_school_environment",
    label: "Preferred school environment",
    helper: "Small / large, quiet / busy, structured / flexible…",
  },
  {
    key: "high_school_options_considered",
    label: "High school options being considered",
    long: true,
  },
  {
    key: "student_hopes_for_high_school",
    label: "What the student is hoping for in high school",
    long: true,
  },
  { key: "family_concerns", label: "What the family is worried about", long: true },
  { key: "transportation_considerations", label: "Transportation considerations" },
];

function IntakePage() {
  const loadStudents = useServerFn(listStudents);
  const loadProfile = useServerFn(getBridgeforwardProfile);
  const saveProfile = useServerFn(upsertBridgeforwardProfile);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState<string>("");
  const [form, setForm] = useState<Form>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    loadProfile({ data: { studentId } })
      .then(({ profile }) => {
        if (profile) {
          setGrade(profile.grade ? String(profile.grade) : "");
          const next: Form = {};
          for (const f of FIELDS) {
            const v = (profile as Record<string, unknown>)[f.key];
            next[f.key] = (v as string | null) ?? "";
          }
          setForm(next);
        } else {
          setForm({});
          setGrade("");
        }
      })
      .finally(() => setLoading(false));
  }, [studentId, loadProfile]);

  async function handleSave() {
    if (!studentId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        student_id: studentId,
        grade: grade ? Number(grade) : null,
      };
      for (const f of FIELDS) {
        const v = form[f.key];
        payload[f.key] = typeof v === "string" && v.trim() ? v.trim() : null;
      }
      await saveProfile({ data: payload as never });
      toast.success("BridgeForward profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (students.length === 0 && !loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs
            trail={[
              { label: "BridgeForward", to: "/bridgeforward" },
              { label: "Intake" },
            ]}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Add a student first, then come back to start their BridgeForward
            profile.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "BridgeForward", to: "/bridgeforward" },
            { label: "Intake" },
          ]}
        />
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          BridgeForward Profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Just enough to start a thoughtful conversation. Skip anything that
          doesn't fit — you can come back any time.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {students.length > 1 && (
            <div>
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
          <div>
            <Label htmlFor="grade">Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger id="grade" className="mt-1">
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6th grade</SelectItem>
                <SelectItem value="7">7th grade</SelectItem>
                <SelectItem value="8">8th grade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.helper && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.helper}</p>
                )}
                {f.long ? (
                  <Textarea
                    id={f.key}
                    className="mt-1 min-h-[72px]"
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    maxLength={2000}
                  />
                ) : (
                  <Input
                    id={f.key}
                    className="mt-1"
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    maxLength={1000}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
