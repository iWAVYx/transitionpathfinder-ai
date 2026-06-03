// Sitewide language context. Hydrates the active locale from localStorage,
// keeps <html lang> in sync, and owns the DOM translator lifecycle.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocaleCode,
  type LocaleCode,
} from "./config";
import { getTranslator } from "./translator";

type Ctx = {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    let next: LocaleCode = DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocaleCode(stored)) {
        next = stored;
      }
    } catch {
      /* ignore */
    }
    setLocaleState(next);
    document.documentElement.lang = next;
    if (next !== "en") {
      // Defer so the initial React render flushes before we start walking.
      const id = setTimeout(() => getTranslator(next).start(), 0);
      return () => clearTimeout(id);
    }
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
    // Translator.setLocale reloads the page so the English source DOM is
    // restored before we translate into the new locale.
    getTranslator(next).setLocale(next);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback for components that render before the provider (shouldn't happen).
    return { locale: DEFAULT_LOCALE, setLocale: () => {} };
  }
  return ctx;
}
