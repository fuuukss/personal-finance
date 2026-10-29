import { getAccounts, getCategories, getEvents } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { TransactionList } from "@/components/transaction-list";

export default async function TransactionsPage() {
  const [{ language, dictionary }, events, accounts, categories] = await Promise.all([getDictionary(), getEvents(500), getAccounts(), getCategories()]);
  return <main className="page"><div className="page-header"><div><p className="eyebrow">Saldo</p><h1>{dictionary.transactions}</h1></div></div><TransactionList events={events} accounts={accounts} categories={categories} language={language} dictionary={dictionary} searchable /></main>;
}
