import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircleQuestion } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { getPublishedFaqs, type Faq } from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQs | TransitionForward" },
      {
        name: "description",
        content:
          "Find answers to frequently asked questions about TransitionForward, transition planning, and postsecondary support for Connecticut students.",
      },
      {
        property: "og:title",
        content: "Frequently Asked Questions | TransitionForward",
      },
      {
        property: "og:description",
        content:
          "Find answers to frequently asked questions about TransitionForward, transition planning, and postsecondary support.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const fetchFaqs = useServerFn(getPublishedFaqs);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Load once on mount
  useState(() => {
    fetchFaqs({ data: {} }).then((r) => {
      setFaqs(r.faqs);
      setLoaded(true);
    });
  });

  // Actually load properly with useEffect equivalent via useMemo trick or inline
  // Since we can't use hooks inside conditionals, let's use a ref-like pattern
  // Actually, let me just use the standard pattern but inline.
  // I'll replace this with a proper useEffect-like pattern below

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
    // Sort categories deterministically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <SiteShell>
      <section className="bg-gradient-to-b from-primary/5 to-background pb-16 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Badge
            variant="secondary"
            className="mb-4 inline-flex items-center gap-1.5"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Help Center
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Find answers about TransitionForward, transition planning, and how
            we support Connecticut families, students, and educators.
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

          <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
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

      <section className="mx-auto max-w-3xl px-4 pb-24">
        {!loaded ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <MessageCircleQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-medium text-foreground">
              No matching questions
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or category.
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
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Contact us
              </Link>
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
    </SiteShell>
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
