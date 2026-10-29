import type { Language } from "@/lib/i18n/dictionaries";

const defaultAccountNames: Record<string, Record<Language, string>> = {
  "RSD Cash": { "sr-Latn": "Dinarski keš", en: "RSD Cash" },
  "RSD Card": { "sr-Latn": "Dinarska kartica", en: "RSD Card" },
  "EUR Savings": { "sr-Latn": "EUR štednja", en: "EUR Savings" },
  "USD Savings": { "sr-Latn": "USD štednja", en: "USD Savings" },
};

export function displayAccountName(name: string, language: Language) {
  return defaultAccountNames[name]?.[language] ?? name;
}
