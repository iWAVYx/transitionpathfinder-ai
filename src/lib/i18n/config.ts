// Supported locales for sitewide translation.
// `en` is the source language; everything else is machine-translated at runtime
// via the Lovable AI Gateway and cached in localStorage.

export const LOCALES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "ht", label: "Haitian Creole", nativeLabel: "Kreyòl Ayisyen" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALE_STORAGE_KEY = "i18n:locale";
export const TRANSLATION_CACHE_KEY = "i18n:cache:v1";

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return !!value && LOCALES.some((l) => l.code === value);
}

export function getLocaleLabel(code: LocaleCode) {
  return LOCALES.find((l) => l.code === code)?.nativeLabel ?? code;
}
