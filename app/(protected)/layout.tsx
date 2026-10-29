import { AppChrome } from "@/components/app-chrome";
import { getAccounts, getCategories } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const [{ dictionary, language }, accounts, categories] = await Promise.all([getDictionary(), getAccounts(), getCategories()]);
  return <AppChrome accounts={accounts} categories={categories} dictionary={dictionary} language={language}>{children}</AppChrome>;
}
