// Client-side DOM translator.
//
// Strategy: instead of forcing every screen to be rewritten with t() calls,
// we walk the rendered DOM, collect human-visible text (text nodes plus a
// small allow-list of attributes), batch-translate via Lovable AI, swap the
// text in place, and cache results in localStorage. A MutationObserver keeps
// translating as the app updates.

import { TRANSLATION_CACHE_KEY, type LocaleCode } from "./config";
import { translateBatch } from "./translate.functions";

// Tags whose text content should never be translated (code, controlled inputs,
// SVG, scripts, etc.).
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "SVG",
  "PATH",
  "CIRCLE",
  "RECT",
  "G",
  "DEFS",
  "USE",
  "SYMBOL",
]);

// Translatable element attributes.
const ATTRS = ["aria-label", "title", "placeholder", "alt"];

const ATTR_TRANSLATED = "data-i18n-translated";
const ATTR_NO = "data-i18n-skip";

type Cache = Record<string, Record<string, string>>; // locale -> (source -> translated)

function loadCache(): Cache {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Cache) {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

function shouldSkipElement(el: Element | null): boolean {
  while (el) {
    if (el instanceof HTMLElement) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.hasAttribute(ATTR_NO)) return true;
      if (el.getAttribute("translate") === "no") return true;
      if (el.isContentEditable) return true;
    } else {
      if (SKIP_TAGS.has(el.tagName)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

// A string is "translatable" if it contains at least one letter. This skips
// numbers, punctuation, and whitespace-only nodes.
function isTranslatable(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  return /\p{L}/u.test(trimmed);
}

type TextTarget = { kind: "text"; node: Text; original: string };
type AttrTarget = { kind: "attr"; el: Element; name: string; original: string };
type Target = TextTarget | AttrTarget;

function collectTargets(root: Node, locale: LocaleCode, cache: Cache): Target[] {
  const out: Target[] = [];
  const localeCache = cache[locale] ?? {};

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).data;
      if (!isTranslatable(text)) return;
      const parent = (node as Text).parentElement;
      if (shouldSkipElement(parent)) return;
      out.push({ kind: "text", node: node as Text, original: text });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el instanceof HTMLElement && el.hasAttribute(ATTR_NO)) return;
    if (el.getAttribute("translate") === "no") return;

    // attributes
    for (const attr of ATTRS) {
      const val = el.getAttribute(attr);
      if (val && isTranslatable(val)) {
        const marker = `${ATTR_TRANSLATED}-${attr}`;
        if (el.getAttribute(marker) !== val) {
          out.push({ kind: "attr", el, name: attr, original: val });
        }
      }
    }

    // recurse children
    for (let i = 0; i < el.childNodes.length; i++) {
      walk(el.childNodes[i]);
    }
  };

  walk(root);

  // Filter out anything already translated via cache (we apply those inline below)
  return out.filter((t) => {
    const cached = localeCache[t.original];
    if (cached == null) return true;
    applyTranslation(t, cached);
    return false;
  });
}

function applyTranslation(target: Target, translated: string) {
  if (target.kind === "text") {
    if (target.node.data !== translated) target.node.data = translated;
  } else {
    target.el.setAttribute(target.name, translated);
    target.el.setAttribute(`${ATTR_TRANSLATED}-${target.name}`, translated);
  }
}

export class Translator {
  private locale: LocaleCode;
  private cache: Cache;
  private observer: MutationObserver | null = null;
  private queue: Target[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<unknown> | null = null;
  private failed = new Set<string>();
  private started = false;

  constructor(locale: LocaleCode) {
    this.locale = locale;
    this.cache = loadCache();
  }

  start() {
    if (this.started) return;
    this.started = true;
    if (this.locale === "en") return;
    if (typeof document === "undefined") return;
    this.scan(document.body);

    this.observer = new MutationObserver((mutations) => {
      const roots = new Set<Node>();
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => roots.add(n));
        } else if (m.type === "characterData") {
          roots.add(m.target);
        } else if (m.type === "attributes" && m.target instanceof Element) {
          roots.add(m.target);
        }
      }
      roots.forEach((r) => this.scan(r));
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.started = false;
  }

  setLocale(locale: LocaleCode) {
    if (locale === this.locale) return;
    const wasRunning = this.started;
    this.stop();
    this.locale = locale;
    this.failed.clear();
    this.queue = [];
    if (wasRunning || locale !== "en") {
      // Reload page so original English DOM is restored before re-translating.
      // This is simpler and more reliable than tracking every node's original.
      if (typeof window !== "undefined") {
        window.location.reload();
        return;
      }
    }
    this.start();
  }

  private scan(root: Node) {
    if (this.locale === "en") return;
    const targets = collectTargets(root, this.locale, this.cache);
    if (targets.length === 0) return;
    // Dedupe by original string within the queue add
    const filtered = targets.filter((t) => !this.failed.has(t.original));
    this.queue.push(...filtered);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 80);
  }

  private async flush() {
    if (this.inflight) {
      // chain: wait, then retry
      await this.inflight.catch(() => {});
      this.scheduleFlush();
      return;
    }
    if (this.queue.length === 0) return;
    const locale = this.locale;
    if (locale === "en") return;

    const batch = this.queue.splice(0, this.queue.length);
    const localeCache = (this.cache[locale] ??= {});

    // Build unique source list; map originals to all targets.
    const targetsBySource = new Map<string, Target[]>();
    for (const t of batch) {
      const arr = targetsBySource.get(t.original) ?? [];
      arr.push(t);
      targetsBySource.set(t.original, arr);
    }

    // Some sources may have been translated since we collected them (race).
    const sources: string[] = [];
    for (const src of targetsBySource.keys()) {
      const cached = localeCache[src];
      if (cached != null) {
        targetsBySource.get(src)?.forEach((t) => applyTranslation(t, cached));
      } else {
        sources.push(src);
      }
    }
    if (sources.length === 0) return;

    // Cap batch size to keep server payload reasonable.
    const MAX = 60;
    const chunk = sources.slice(0, MAX);
    const remaining = sources.slice(MAX);

    this.inflight = (async () => {
      try {
        const res = await translateBatch({ data: { locale, texts: chunk } });
        const translations = res.translations;
        for (let i = 0; i < chunk.length; i++) {
          const src = chunk[i];
          const out = translations[i] ?? src;
          localeCache[src] = out;
          targetsBySource.get(src)?.forEach((t) => applyTranslation(t, out));
        }
        saveCache(this.cache);
      } catch (err) {
        console.warn("[i18n] translation batch failed", err);
        // Don't retry these strings forever.
        for (const src of chunk) this.failed.add(src);
      } finally {
        this.inflight = null;
      }
    })();

    await this.inflight;

    if (remaining.length > 0) {
      // Re-queue the remainder as a fresh scan would
      const remainingTargets: Target[] = [];
      for (const src of remaining) {
        targetsBySource.get(src)?.forEach((t) => remainingTargets.push(t));
      }
      this.queue.push(...remainingTargets);
      this.scheduleFlush();
    }
  }
}

let singleton: Translator | null = null;
export function getTranslator(locale: LocaleCode): Translator {
  if (!singleton) singleton = new Translator(locale);
  return singleton;
}
