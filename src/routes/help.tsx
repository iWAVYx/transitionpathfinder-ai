import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { submitWaitlist } from "@/lib/waitlist.functions";

const ContactSchema = z.object({
  full_name: z.string().trim().min(1, "Please tell us your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum([
    "family-question",
    "educator-question",
    "district-demo",
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

const TOPIC_TO_ROLE: Record<ContactValues["topic"], "family" | "educator" | "district" | "partner" | "other"> = {
  "family-question": "family",
  "educator-question": "educator",
  "district-demo": "district",
  "press-research": "other",
  accessibility: "other",
  other: "other",
};

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

function HelpHeroAndFaqs() {
  const fetchFaqs = useServerFn(getPublishedFaqs);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetchFaqs({ data: {} }).then((r) => {
      setFaqs(r.faqs);
      setLoaded(true);
    });
  }, [fetchFaqs]);

  const categories = useMemo(
    () => Array.from(new Set(faqs.map((f) => f.category))).sort(),
    [faqs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesCategory =
        activeCategory === "all" || f.category === activeCategory;
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

  return (
    <>
      <section className="bg-gradient-to-b from-primary/5 to-background pb-16 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Badge variant="secondary" className="mb-4 inline-flex items-center gap-1.5">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Help & Contact
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How can we help?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Search the FAQs below, or scroll down to send us a message — a real
            Connecticut human replies within two school days.
          </p>

          <div className="relative mx-auto mt-8 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        {!loaded ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <MessageCircleQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No matching questions
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or jump to the contact form below.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
              {activeCategory !== "all" && (
                <button
                  onClick={() => setActiveCategory("all")}
                  className="text-sm text-primary hover:underline"
                >
                  Show all categories
                </button>
              )}
            </div>
            <div className="mt-6">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Send us a message
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {activeCategory === "all"
              ? grouped.map(([category, items]) => (
                  <div key={category}>
                    <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                      {category}
                    </h2>
                    <Accordion type="single" collapsible className="space-y-3">
                      {items.map((faq) => (
                        <FaqAccordionItem key={faq.id} faq={faq} />
                      ))}
                    </Accordion>
                  </div>
                ))
              : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filtered.map((faq) => (
                    <FaqAccordionItem key={faq.id} faq={faq} />
                  ))}
                </Accordion>
              )}
          </div>
        )}
      </section>
    </>
  );
}

function FaqAccordionItem({ faq }: { faq: Faq }) {
  return (
    <AccordionItem
      value={faq.id}
      className="rounded-lg border border-border bg-card px-4 transition-shadow hover:shadow-sm"
    >
      <AccordionTrigger className="py-4 text-left font-medium text-foreground hover:no-underline">
        {faq.question}
      </AccordionTrigger>
      <AccordionContent className="pb-4 text-muted-foreground">
        <div className="whitespace-pre-wrap leading-relaxed">{faq.answer}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ContactSection() {
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitWaitlist);

  const form = useForm<ContactValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      full_name: "",
      email: "",
      topic: "family-question",
      message: "",
    },
  });

  const onSubmit = async (values: ContactValues) => {
    try {
      await submit({
        data: {
          full_name: values.full_name,
          email: values.email,
          role: TOPIC_TO_ROLE[values.topic],
          state: "",
          student_grade_band: "",
          reason: `[${values.topic}] ${values.message}`,
          source: "contact-form",
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <section id="contact" className="border-t bg-muted/20 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
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

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <HelpCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Families & students"
            body="Stuck on the Pathway Report, the IEP upload, or anything in the Student Hub? We'll walk through it with you."
          />
          <HelpCard
            icon={<LifeBuoy className="h-5 w-5" />}
            title="Educators & districts"
            body="Caseload questions, training requests, CT SEDS alignment, or a 20-minute demo for your team — just ask."
          />
          <HelpCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Accessibility & privacy"
            body="Found a barrier or have a question about how we handle student data? Flag it here and we'll prioritize it."
          />
        </div>

        {!done ? (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-10 grid gap-5 rounded-3xl border bg-card p-6 shadow-soft md:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" error={form.formState.errors.full_name?.message}>
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
                defaultValue="family-question"
                onValueChange={(v) => form.setValue("topic", v as ContactValues["topic"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick the closest fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family-question">I'm a family member with a question</SelectItem>
                  <SelectItem value="educator-question">I'm an educator / case manager</SelectItem>
                  <SelectItem value="district-demo">School / district demo</SelectItem>
                  <SelectItem value="press-research">Press, research, or partnership</SelectItem>
                  <SelectItem value="accessibility">Accessibility issue or feedback</SelectItem>
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
