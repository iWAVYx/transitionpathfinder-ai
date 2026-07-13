import { useEffect, useMemo, useState } from "react";
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

function defaultSessions(): Session[] {
  const today = new Date();
  const add = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: "s1", title: "Kickoff & Platform Overview", date: add(7), audience: "All staff", location: "Virtual" },
    { id: "s2", title: "Pathway Report Deep Dive", date: add(21), audience: "Educators, Case managers", location: "Virtual" },
    { id: "s3", title: "Family & Student Voice Workshop", date: add(45), audience: "Educators, School admin", location: "On-site" },
  ];
}

export function TrainingScheduleCard({ scopeId }: { scopeId: string }) {
  const storageKey = STORAGE_PREFIX + scopeId;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [audience, setAudience] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setSessions(raw ? (JSON.parse(raw) as Session[]) : defaultSessions());
    } catch {
      setSessions(defaultSessions());
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch {
      /* ignore */
    }
  }, [sessions, hydrated, storageKey]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => a.date.localeCompare(b.date)),
    [sessions],
  );
  const today = new Date().toISOString().slice(0, 10);

  function add() {
    if (!title.trim() || !date) return;
    setSessions((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        date,
        audience: audience.trim() || "All staff",
        location: location.trim() || "TBD",
      },
    ]);
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
        Plan onboarding and skill-building sessions. Saved locally to your browser.
      </p>

      <ul className="mt-4 divide-y rounded-xl border">
        {sorted.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No training sessions scheduled yet.</li>
        )}
        {sorted.map((s) => {
          const past = s.date < today;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.title}
                  {past ? (
                    <Badge variant="secondary">Delivered</Badge>
                  ) : (
                    <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">Upcoming</Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.date} · {s.audience} · {s.location}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}
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
          <Label htmlFor="train-title">Session</Label>
          <Input id="train-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Advanced Meeting Prep" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="train-date">Date</Label>
          <Input id="train-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="train-aud">Audience</Label>
          <Input id="train-aud" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Educators" />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="train-loc">Location</Label>
          <Input id="train-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Virtual or on-site" />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <Button onClick={add} disabled={!title.trim() || !date} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add training session
          </Button>
        </div>
      </div>
    </div>
  );
}
