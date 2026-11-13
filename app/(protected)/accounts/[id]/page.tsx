import { notFound } from "next/navigation";
import { AccountDetails } from "@/components/account-details";
import { getAccount, getAccountOptions, getAccountRemovalStrategy, getCategories, getEvents } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";

export default async function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const accountPromise = getAccount(id);
  const [{ language, dictionary }, account, accounts, categories, events, removalStrategy] = await Promise.all([
    getDictionary(),
    accountPromise,
    getAccountOptions(),
    getCategories(),
    getEvents(5000, undefined, undefined, id),
    accountPromise.then((candidate) => candidate ? getAccountRemovalStrategy(id) : null),
  ]);
  if (!account || !removalStrategy) notFound();
  return <main className="page"><AccountDetails account={account} accounts={accounts} events={events} categories={categories} removalStrategy={removalStrategy} language={language} dictionary={dictionary} /></main>;
}
