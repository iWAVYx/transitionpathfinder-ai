import { Archive, Sparkles, MapPin } from "lucide-react";

const layers = [
  {
    icon: Archive,
    tag: "Organize",
    title: "Hold The Story In One Place",
    body: "Student and family voice, assessments, IEP goals, work samples, and PPT notes, kept together year over year.",
  },
  {
    icon: Sparkles,
    tag: "Generate",
    title: "Turn It Into A Real Plan",
    body: "Lovable AI reads the full picture and drafts a personalized Pathway Report, PPT prep packet, and 30 day plan.",
  },
  {
    icon: MapPin,
    tag: "Connect",
    title: "Open Doors In Connecticut",
    body: "Match interests to community colleges, technical high schools, BRS, internships, and job training near home.",
  },
];

export function LayerDiagram() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {layers.map(({ icon: Icon, tag, title, body }, i) => (
        <div
          key={tag}
          className="relative rounded-3xl border border-border/60 bg-card p-7 shadow-soft"
        >
          <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
            Layer {i + 1}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">{tag}</p>
          <h3 className="mt-1 font-display text-2xl font-medium tracking-tight">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      ))}
    </div>
  );
}
