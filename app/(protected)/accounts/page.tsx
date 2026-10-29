import { getAccounts } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { AccountsManager } from "@/components/accounts-manager";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const [{ language, dictionary }, accounts, query] = await Promise.all([getDictionary(), getAccounts(true), searchParams]);
  const notice = query.account === "deleted"
    ? dictionary.accountDeleted
    : query.account === "archived"
      ? dictionary.accountArchived
      : query.account === "restored"
        ? dictionary.accountRestored
        : "";
  return <main className="page"><AccountsManager accounts={accounts} language={language} dictionary={dictionary} notice={notice} /></main>;
}
