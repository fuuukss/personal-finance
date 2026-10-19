import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Language } from "@/lib/i18n/dictionaries";

export async function getLanguage(): Promise<Language> {
  const value = (await cookies()).get("pf_lang")?.value;
  return value === "en" ? "en" : "sr-Latn";
}

export async function getDictionary() {
  const language = await getLanguage();
  return { language, dictionary: dictionaries[language] };
}
