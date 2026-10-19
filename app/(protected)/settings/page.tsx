import { getCategories, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { SettingsPanel } from "@/components/settings-panel";
import { CategoryManager } from "@/components/category-manager";

export default async function SettingsPage() {
  const [{ language, dictionary }, settings, categories] = await Promise.all([getDictionary(), getSettings(), getCategories()]);
  return <main className="page" style={{ maxWidth: "760px" }}><div className="page-header"><div><p className="eyebrow">Saldo</p><h1>{dictionary.settings}</h1></div></div><SettingsPanel language={language} currency={settings?.display_currency ?? "RSD"} dictionary={dictionary} /><CategoryManager categories={categories} dictionary={dictionary} /></main>;
}
