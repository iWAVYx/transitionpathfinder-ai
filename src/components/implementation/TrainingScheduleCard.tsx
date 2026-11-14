import { useEffect, useId, useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Session = {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  audience: string;
  location: string;
};

const STORAGE_PREFIX = "tf.training-schedule.v1:";

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const row = value as Session;
  return (
    [row.id, row.title, row.date, row.audience, row.location].every(
      (value) => typeof value === "string",
    ) &&
    !!row.id &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    !Number.isNaN(Date.parse(`${row.date}T12:00:00Z`)) &&
    new Date(`${row.date}T12:00:00Z`).toISOString().slice(0, 10) === row.date
  );
}
function isEarlierExample(session: Session) {
  return (
    (session.id === "s1" &&
      session.title === "Kickoff & Platform Overview" &&
      session.audience === "All staff" &&
      session.location === "Virtual") ||
    (session.id === "s2" &&
      session.title === "Pathway Report Deep Dive" &&
      session.audience === "Educators, Case managers" &&
      session.location === "Virtual") ||
    (session.id === "s3" &&
      session.title === "Family & Student Voice Workshop" &&
      session.audience === "Educators, School admin" &&
      session.location === "On-site")
  );
}

export function TrainingScheduleCard({ scopeId }: { scopeId: string }) {
  return <TrainingScheduleEditor key={scopeId} scopeId={scopeId} />;
}
function TrainingScheduleEditor({ scopeId }: { scopeId: string }) {
  const storageKey = STORAGE_PREFIX + scopeId;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [savedRaw, setSavedRaw] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const formId = useId();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [audience, setAudience] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setHydrated(false);
    setSessions([]);
    setError(null);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      if (
        !Array.isArray(parsed) ||
        !parsed.every(isSession) ||
        new Set(parsed.map((row) => row.id)).size !== parsed.length
      )
        throw new Error();
      setSessions(parsed);
      setSavedRaw(raw);
      setHydrated(true);
    } catch {
      setError("This browser's saved schedule could not be read. Reload it before editing.");
    }
  }, [storageKey, attempt]);

  function save(next: Session[]) {
    if (!hydrated) return false;
    try {
      if (localStorage.getItem(storageKey) !== savedRaw) {
        setHydrated(false);
        setSessions([]);
        setError("This schedule changed in another tab. Reload it before editing.");
        return false;
      }
      const raw = JSON.stringify(next);
      localStorage.setItem(storageKey, raw);
      setSavedRaw(raw);
      setSessions(next);
      setError(null);
      return true;
    } catch {
      setError("Your change was not saved in this browser. Please try the change again.");
      return false;
    }
  }

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => a.date.localeCompare(b.date)),
    [sessions],
  );
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function add() {
    if (!hydrated || !title.trim() || !date) return;
    const next = [
      ...sessions,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        date,
        audience: audience.trim(),
        location: location.trim(),
      },
    ];
    if (!next.every(isSession) || !save(next)) return;
    setTitle("");
    setDate("");
    setAudience("");
    setLocation("");
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-primary" />
        <h2 className="font-medium">Training Schedule</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Plan training sessions for this workspace. Saved only in this browser; not shared with the
        team.
      </p>

      {error && (
        <div role="alert" className="mt-3 text-sm">
          <p>{error}</p>
          {!hydrated && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reload Schedule
            </Button>
          )}
        </div>
      )}
      <ul className="mt-4 divide-y rounded-xl border">
        {!error && sorted.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            {hydrated ? "No training sessions scheduled yet." : "Loading this browser’s schedule…"}
          </li>
        )}
        {sorted.map((s) => {
          const past = s.date < today;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.title}
                  {isEarlierExample(s) && (
                    <Badge variant="secondary">Earlier Example — Confirm Details</Badge>
                  )}
                  {past ? (
                    <Badge variant="secondary">Past Date</Badge>
                  ) : (
                    <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
                      Upcoming Date
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.date} · {s.audience || "Audience not recorded"} · {s.location || "Location not recorded"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hydrated}
                onClick={() => save(sessions.filter((x) => x.id !== s.id))}
                aria-label={`Remove ${s.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5 lg:col-span-2">
          <Label htmlFor={`${formId}-title`}>Session</Label>
          <Input
            id={`${formId}-title`}
            disabled={!hydrated}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced Meeting Prep"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-date`}>Date</Label>
          <Input
            id={`${formId}-date`}
            disabled={!hydrated}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-aud`}>Audience</Label>
          <Input
            id={`${formId}-aud`}
            disabled={!hydrated}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. Educators"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${formId}-loc`}>Location</Label>
          <Input
            id={`${formId}-loc`}
            disabled={!hydrated}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Virtual or on-site"
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <Button
            onClick={add}
            disabled={!hydrated || !title.trim() || !date}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-1 h-4 w-4" /> Add Training Session
          </Button>
        </div>
      </div>
    </div>
  );
}
