import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Search,
  X,
  MessageCircleQuestion,
  Mail,
  MessageCircle,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Users,
  School,
  BookOpen,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { getPublishedFaqs, type Faq } from "@/lib/cms/cms.functions";
import { submitContactForm } from "@/lib/owner/owner.functions";

const ContactSchema = z.object({
  full_name: z.string().trim().min(1, "Please tell us your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum([
    "general",
    "family-question",
    "educator-question",
    "district-demo",
    "partnership",
    "technical",
    "demo-request",
    "feedback",
    "press-research",
    "accessibility",
    "other",
  ]),
  message: z
    .string()
    .trim()
    .min(5, "A sentence or two helps us route this to the right person")
    .max(2000),
});

type ContactValues = z.infer<typeof ContactSchema>;

const TOPIC_TO_INQUIRY: Record<ContactValues["topic"], string> = {
  general: "general",
  "family-question": "family",
  "educator-question": "educator",
  "district-demo": "demo",
  partnership: "partnership",
  technical: "technical",
  "demo-request": "demo",
  feedback: "feedback",
  "press-research": "press",
  accessibility: "accessibility",
  other: "general",
};

const SUPPORT_CATEGORIES: {
  topic: ContactValues["topic"];
  title: string;
  body: string;
  icon: React.ReactNode;
}[] = [
  {
    topic: "general",
    title: "General Questions",
    body: "Not sure where to start? We'll point you to the right resource or teammate.",
    icon: <MessageCircleQuestion className="h-5 w-5" />,
  },
  {
    topic: "family-question",
    title: "Family Support",
    body: "Help with student profiles, Pathway Reports, IEP uploads, or planning at home.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    topic: "educator-question",
    title: "School and Educator Support",
    body: "Caseload questions, training, CT SEDS alignment, or onboarding your team.",
    icon: <School className="h-5 w-5" />,
  },
  {
    topic: "partnership",
    title: "Partnership Inquiries",
    body: "Colleges, technical programs, BRS, employers, and community organizations.",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    topic: "technical",
    title: "Technical Help",
    body: "Login trouble, missing data, accessibility barriers, or a feature that isn't working.",
    icon: <LifeBuoy className="h-5 w-5" />,
  },
  {
    topic: "demo-request",
    title: "Demo Requests",
    body: "Schedule a 20-minute walkthrough for your school, district, or program.",
    icon: <Eye className="h-5 w-5" />,
  },
  {
    topic: "feedback",
    title: "Feedback or Suggestions",
    body: "Tell us what's working, what's missing, and what would make this better for you.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Contact | TransitionForward" },
      {
        name: "description",
        content:
          "Find answers to common questions about TransitionForward, or send us a message. Real people answer every question during the pilot.",
      },
      { property: "og:title", content: "Help & Contact | TransitionForward" },
      {
        property: "og:description",
        content:
          "Browse FAQs about transition planning, or contact our Connecticut pilot team directly.",
      },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/help" }],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <SiteShell>
      <HelpHeroAndFaqs />
      <ContactSection />
    </SiteShell>
  );
}

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string }> = {
  "Getting Started": { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Getting Started" },
  "Families & Students": { icon: <Users className="h-3.5 w-3.5" />, label: "For Families" },
  "Educators & Districts": { icon: <School className="h-3.5 w-3.5" />, label: "For Educators" },
  "Accessibility": { icon: <Eye className="h-3.5 w-3.5" />, label: "Accessibility" },
};

const POPULAR_SEARCHES = [
  "IEP",
  "Pathway Report",
  "CT SEDS",
  "create account",
  "student",
  "privacy",
  "training",
  "mobile",
];

function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-primary/15 px-0.5 font-semibold text-primary">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function HelpHeroAndFaqs() {
  const fetchFaqs = useServerFn(getPublishedFaqs);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isSticky, setIsSticky] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFaqs({ data: {} }).then((r) => {
      setFaqs(r.faqs);
      setLoaded(true);
    });
  }, [fetchFaqs]);

  // Keyboard shortcut: / or Cmd+K to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) ||
        (e.metaKey && e.key === "k")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sticky filter bar on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!stickyRef.current) return;
      const rect = stickyRef.current.getBoundingClientRect();
      setIsSticky(rect.top <= 72);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(faqs.map((f) => f.category))).sort(),
    [faqs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesCategory = activeCategory === "all" || f.category === activeCategory;
      if (!term) return matchesCategory;
      const inQuestion = f.question.toLowerCase().includes(term);
      const inAnswer = f.answer.toLowerCase().includes(term);
      return matchesCategory && (inQuestion || inAnswer);
    });
  }, [faqs, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    for (const f of filtered) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const hasFilters = search.trim() !== "" || activeCategory !== "all";

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background pb-8 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Help & Contact
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How Can We Help?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Search our FAQ library by keyword or topic, or scroll down to send us a message — a real
            Connecticut human replies within two school days.
          </p>
        </div>
      </section>

      {/* Sticky Search & Filter Bar */}
      <div
        ref={stickyRef}
        className={`sticky top-[calc(env(safe-area-inset-top)+4rem)] z-30 transition-all duration-300 ${
          isSticky
            ? "border-b border-border/60 bg-background/95 py-2 shadow-sm backdrop-blur-md sm:py-3"
            : "bg-transparent py-4 sm:py-6"
        }`}
      >
        <div className="mx-auto max-w-3xl px-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search questions or keywords…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-border/80 bg-card pl-10 pr-20 text-base shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                /
              </kbd>
            </div>
          </div>

          {/* Active filters & result count */}
          {hasFilters && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {search && (
                  <Badge variant="outline" className="gap-1 pr-1.5 text-xs font-normal">
                    <Search className="h-3 w-3" />
                    {search}
                    <button
                      onClick={() => setSearch("")}
                      className="ml-1 rounded-sm p-0.5 hover:bg-muted"
                      aria-label="Remove search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {activeCategory !== "all" && (
                  <Badge variant="outline" className="gap-1 pr-1.5 text-xs font-normal">
                    {CATEGORY_META[activeCategory]?.label ?? activeCategory}
                    <button
                      onClick={() => setActiveCategory("all")}
                      className="ml-1 rounded-sm p-0.5 hover:bg-muted"
                      aria-label="Remove category filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "question" : "questions"} found
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {/* Popular searches */}
        {!hasFilters && (
          <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => setSearch(term)}
                className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Category filter pills */}
        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <button
              onClick={() => setActiveCategory("all")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All topics
            </button>
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat] ?? { icon: <BookOpen className="h-3.5 w-3.5" />, label: cat };
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {meta.icon}
                  {meta.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* FAQ Results */}
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        {!loaded ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center sm:p-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No matching questions</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Try a different keyword, pick a topic above, or send us a message — we read every one.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  Browse {CATEGORY_META[cat]?.label ?? cat}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Send us a message
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {activeCategory === "all"
              ? grouped.map(([category, items]) => (
                  <div key={category}>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {CATEGORY_META[category]?.icon ?? <BookOpen className="h-3.5 w-3.5" />}
                      </span>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {CATEGORY_META[category]?.label ?? category}
                      </h2>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {items.length}
                      </Badge>
                    </div>
                    <Accordion type="single" collapsible className="space-y-3">
                      {items.map((faq) => (
                        <FaqAccordionItem key={faq.id} faq={faq} highlightTerm={search.trim()} />
                      ))}
                    </Accordion>
                  </div>
                ))
              : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filtered.map((faq) => (
                    <FaqAccordionItem key={faq.id} faq={faq} highlightTerm={search.trim()} />
                  ))}
                </Accordion>
              )}
          </div>
        )}
      </section>
    </>
  );
}

function FaqAccordionItem({ faq, highlightTerm }: { faq: Faq; highlightTerm: string }) {
  return (
    <AccordionItem
      value={faq.id}
      className="rounded-xl border border-border bg-card px-5 transition-shadow hover:shadow-sm"
    >
      <AccordionTrigger className="py-4 text-left font-medium text-foreground hover:no-underline">
        <HighlightText text={faq.question} term={highlightTerm} />
      </AccordionTrigger>
      <AccordionContent className="pb-4 text-muted-foreground">
        <div className="whitespace-pre-wrap leading-relaxed">
          <HighlightText text={faq.answer} term={highlightTerm} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ContactSection() {
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitContactForm);

  const form = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      full_name: "",
      email: "",
      topic: "general",
      message: "",
    },
  });

  const onSubmit = async (values: ContactValues) => {
    try {
      const [first, ...rest] = values.full_name.trim().split(/\s+/);
      await submit({
        data: {
          first_name: first || values.full_name,
          last_name: rest.join(" ") || null,
          email: values.email,
          inquiry_type: TOPIC_TO_INQUIRY[values.topic],
          message: values.message,
          source_page: typeof window !== "undefined" ? window.location.pathname : "/help",
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <section id="contact" className="border-t bg-muted/20 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Still have questions?
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
            A real person reads every message.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            We're a small pilot team in Connecticut. No ticket queues, no chatbots. Tell us
            what you need — for your student, your classroom, your district, or your program —
            and we'll get back to you within two school days.
          </p>
        </header>

        <div className="mt-10 flex flex-wrap justify-center gap-4 [&>*]:basis-full sm:[&>*]:basis-[calc(50%-0.5rem)] lg:[&>*]:basis-[calc(25%-0.75rem)]">
          {SUPPORT_CATEGORIES.map((c) => (
            <button
              key={c.topic}
              type="button"
              onClick={() => {
                form.setValue("topic", c.topic);
                document
                  .getElementById("contact-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                {c.icon}
              </span>
              <h3 className="mt-3 font-display text-base font-medium leading-snug">{c.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
              <span className="mt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Use this topic →
              </span>
            </button>
          ))}
        </div>

        {!done ? (
          <form
            id="contact-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-10 grid gap-5 scroll-mt-24 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your Name" error={form.formState.errors.full_name?.message}>
                <Input {...form.register("full_name")} placeholder="First and last name" maxLength={200} />
              </Field>
              <Field label="Email" error={form.formState.errors.email?.message}>
                <Input
                  type="email"
                  {...form.register("email")}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </Field>
            </div>

            <Field label="What is this about?" error={form.formState.errors.topic?.message}>
              <Select
                value={form.watch("topic")}
                defaultValue="general"
                onValueChange={(v) => form.setValue("topic", v as ContactValues["topic"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick the closest fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General questions</SelectItem>
                  <SelectItem value="family-question">Family support</SelectItem>
                  <SelectItem value="educator-question">School & educator support</SelectItem>
                  <SelectItem value="partnership">Partnership inquiry</SelectItem>
                  <SelectItem value="technical">Technical help</SelectItem>
                  <SelectItem value="demo-request">Demo request</SelectItem>
                  <SelectItem value="district-demo">School / district demo</SelectItem>
                  <SelectItem value="feedback">Feedback or suggestions</SelectItem>
                  <SelectItem value="press-research">Press, research, or partnership</SelectItem>
                  <SelectItem value="accessibility">Accessibility issue</SelectItem>
                  <SelectItem value="other">Something else</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Your message" error={form.formState.errors.message?.message}>
              <Textarea
                rows={6}
                maxLength={2000}
                {...form.register("message")}
                placeholder="Tell us what's happening, what you need, or what you'd like to see. Plain language is best — no special-education jargon required."
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Don't include sensitive student data here. For anything involving a child's
                records, we'll move to a secure channel once we reply.
              </p>
            </Field>

            <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                By sending this you agree to our{" "}
                <Link to="/privacy" className="underline underline-offset-2">
                  privacy notice
                </Link>
                .
              </p>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-10 rounded-3xl border bg-card p-8 shadow-soft sm:p-10">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-2xl font-medium">
                  Got it. Thank you for reaching out.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A real Connecticut human will reply within two school days. If it's urgent,
                  write "urgent" in the subject when you reply to our confirmation and we'll
                  move you to the top of the day.
                </p>
              </div>
            </div>
            <div className="mt-7">
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  form.reset();
                }}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Send another message →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HelpCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
        {icon}
      </span>
      <h3 className="mt-3 font-display text-lg font-medium">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 inline-block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
