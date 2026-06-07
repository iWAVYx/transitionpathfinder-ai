import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ExternalLink,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  CalendarClock,
  CalendarPlus,
  CalendarDays,
} from "lucide-react";
import {
  matchPartnersForStudent,
  type PartnerMatch,
} from "@/lib/partner-matching.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Meeting Prep — Top Partner Contacts + Suggested Deadlines.
 * Shows the top 5 partner matches for the linked student, plus a derived
 * countdown of prep deadlines relative to the meeting date.
 */
export function MeetingPrepPartners({
  studentId,
  meetingDate,
}: {
  studentId: string | null;
  meetingDate: string | null;
}) {
  const fetchMatches = useServerFn(matchPartnersForStudent);
  const [items, setItems] = useState<PartnerMatch[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    fetchMatches({ data: { student_id: studentId, limit: 5 } })
      .then((r) => {
        if (!cancelled) setItems(r.matches);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setErrored(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchMatches]);

  const deadlines = useMemo(() => computeDeadlines(meetingDate), [meetingDate]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-medium tracking-tight">Suggested deadlines</h3>
          {deadlines.parsed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadIcs(deadlines.steps, studentId, () =>
                  toast.success("Calendar reminders downloaded — open the file to add them."),
                )
              }
            >
              <CalendarPlus className="mr-1.5 h-4 w-4" aria-hidden /> Add reminders to calendar
            </Button>
          )}
        </div>
        {deadlines.parsed ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Each reminder pops up the day before — share the file with anyone helping prep
              (other parent, case manager, advocate) so they get notified too.
            </p>
            <ol className="mt-3 space-y-2">
              {deadlines.steps.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3"
                >
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                  <a
                    href={buildGoogleCalendarUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                    title="Add to Google Calendar"
                  >
                    <CalendarDays className="h-3 w-3" aria-hidden />
                    {s.when}
                  </a>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Add a meeting date above and we'll lay out a week-by-week prep timeline with
            calendar reminders you can share.
          </p>
        )}
      </section>

      <section>
        <h3 className="font-display text-lg font-medium tracking-tight">
          Partner contacts to have on hand
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring these names to the PPT — they're matched to the student's interests, county, and
          support needs.
        </p>
        {!studentId ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Link this report to a student profile to see matched partner contacts.
          </p>
        ) : items === null ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading partner matches…
          </p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {errored
              ? "We couldn't reach the partner network just now."
              : "No partner matches yet — add interests, transition status, or support needs to this student's profile."}
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((m) => (
              <li key={m.partner_id} className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline" className="mb-1 uppercase tracking-wider">
                      {m.partner_type?.replace(/_/g, " ") || "Partner"}
                    </Badge>
                    <p className="font-display text-base leading-snug">{m.organization_name}</p>
                    {m.county && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {m.county}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.verification_status === "verified" && (
                      <ShieldCheck
                        className="h-4 w-4 text-emerald-600"
                        aria-label="Verified"
                      />
                    )}
                    {m.is_featured && (
                      <Star className="h-4 w-4 text-amber-500" aria-label="Featured" />
                    )}
                  </div>
                </div>
                {m.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.reasons.slice(0, 2).map((why, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {why}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-foreground/80">
                  <span className="font-medium">Ask about:</span> {m.suggested_next_step}
                </p>
                {m.website_url && (
                  <a
                    href={m.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type DeadlineStep = { label: string; detail: string; when: string; date: Date };

function computeDeadlines(meetingDate: string | null): {
  parsed: boolean;
  steps: DeadlineStep[];
} {
  if (!meetingDate) return { parsed: false, steps: [] };
  const d = new Date(meetingDate);
  if (Number.isNaN(d.getTime())) return { parsed: false, steps: [] };
  const at = (offsetDays: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() - offsetDays);
    return x;
  };
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const make = (offset: number, suffix: string, label: string, detail: string): DeadlineStep => {
    const date = at(offset);
    return { label, detail, when: `${fmt(date)} · ${suffix}`, date };
  };
  return {
    parsed: true,
    steps: [
      make(
        14,
        "2 wks before",
        "Request records & draft documents",
        "Ask the school for the proposed IEP draft, evaluations, and progress reports.",
      ),
      make(
        7,
        "1 wk before",
        "Contact partner organizations",
        "Reach out to the top partner contacts to confirm services, eligibility, and availability.",
      ),
      make(
        3,
        "3 days before",
        "Review with the student",
        "Walk through goals, concerns, and what they want to say in their own words.",
      ),
      make(
        1,
        "day before",
        "Pack the meeting folder",
        "Print the agenda, questions, evidence list, and partner contacts. Confirm time and location.",
      ),
    ],
  };
}

// ---- ICS builder -----------------------------------------------------------

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** All-day VEVENT date in YYYYMMDD (floating, local). */
function icsDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** UTC timestamp for DTSTAMP. */
function icsStamp() {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 line folding + minimal escaping. */
function icsLine(name: string, value: string) {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
  const line = `${name}:${escaped}`;
  if (line.length <= 73) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return out.join("\r\n");
}

function buildIcs(steps: DeadlineStep[], studentId: string | null) {
  const stamp = icsStamp();
  const uidSeed = studentId ?? "meeting-prep";
  const events = steps.map((s, idx) => {
    const start = icsDate(s.date);
    const end = new Date(s.date);
    end.setDate(end.getDate() + 1);
    const uid = `${uidSeed}-${idx}-${start}@transitionforward`;
    return [
      "BEGIN:VEVENT",
      icsLine("UID", uid),
      icsLine("DTSTAMP", stamp),
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      icsLine("SUMMARY", `PPT Prep: ${s.label}`),
      icsLine("DESCRIPTION", `${s.detail}\n\n(${s.when})`),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      icsLine("DESCRIPTION", `Reminder: ${s.label}`),
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TransitionForward//PPT Meeting Prep//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function downloadIcs(
  steps: DeadlineStep[],
  studentId: string | null,
  onDone?: () => void,
) {
  const ics = buildIcs(steps, studentId);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ppt-meeting-prep-reminders.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  onDone?.();
}
