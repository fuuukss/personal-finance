import { getAccounts } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { AccountsManager } from "@/components/accounts-manager";

export default async function AccountsPage() {
  const [{ language, dictionary }, accounts] = await Promise.all([getDictionary(), getAccounts()]);
  return <main className="page"><AccountsManager accounts={accounts} language={language} dictionary={dictionary} /></main>;
}
