import { notFound } from "next/navigation";
import { AccountDetails } from "@/components/account-details";
import { getAccountRemovalStrategy, getAccounts, getCategories, getEvents } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";

export default async function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ language, dictionary }, accounts, categories, events] = await Promise.all([
    getDictionary(), getAccounts(true), getCategories(), getEvents(5000, undefined, undefined, id)
  ]);
  const account = accounts.find((candidate) => candidate.id === id);
  if (!account) notFound();
  const removalStrategy = await getAccountRemovalStrategy(id);
  return <main className="page"><AccountDetails account={account} accounts={accounts.filter((candidate) => candidate.archived_at === null)} events={events} categories={categories} removalStrategy={removalStrategy} language={language} dictionary={dictionary} /></main>;
}
