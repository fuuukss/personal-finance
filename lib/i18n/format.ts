import type { Language } from "@/lib/i18n/dictionaries";

export function formatLocalDate(value: string, language: Language) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (language === "sr-Latn") {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${date.getUTCFullYear()}.`;
  }
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).format(date);
}
