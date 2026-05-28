import { Archive, Sparkles, MapPin } from "lucide-react";
import organizeImg from "@/assets/layer-organize.jpg";
import generateImg from "@/assets/layer-generate.jpg";
import connectImg from "@/assets/layer-connect.jpg";

import { toTitleCase } from "@/lib/title-case";
const layers = [
  {
    icon: Archive,
    tag: "Organize",
    title: "Hold The Story In One Place",
    body: "Student and family voice, assessments, IEP goals, work samples, and PPT notes, kept together year over year.",
    image: organizeImg,
    alt: "A flat-lay of warm manila folders, a peach sticky note, and color-tabbed dividers on cream paper",
  },
  {
    icon: Sparkles,
    tag: "Generate",
    title: "Turn It Into A Real Pathway",
    body: "Our specialist-built formulas read the full picture and draft a personalized Pathway Report, PPT prep packet, and 30 day plan.",
    image: generateImg,
    alt: "A paper collage of small cut-paper symbols connected by hand-drawn dotted lines",
  },
  {
    icon: MapPin,
    tag: "Connect",
    title: "Open Doors In Connecticut",
    body: "Match interests to community colleges, technical high schools, BRS, internships, and job training near home.",
    image: connectImg,
    alt: "A hand-drawn paper map with tiny architectural cutouts and coral pin markers",
  },
];

export function LayerDiagram() {
  return (
    <div className="relative">
      {/* Vertical connector line between cards (desktop only) */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-border to-transparent md:block" />

      <div className="relative grid gap-6 md:grid-cols-3">
        {layers.map(({ icon: Icon, tag, title, body, image, alt }, i) => (
          <div
            key={tag}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={image}
                alt={alt}
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
              <div className="absolute left-5 top-5 rounded-full bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
                Layer {i + 1}
              </div>
              <div className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="p-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{tag}</p>
              <h3 className="mt-1 font-display text-2xl font-medium tracking-tight">{toTitleCase(title)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
