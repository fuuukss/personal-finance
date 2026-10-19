import { getEvents } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { TransactionList } from "@/components/transaction-list";

export default async function TransactionsPage() {
  const [{ language, dictionary }, events] = await Promise.all([getDictionary(), getEvents(500)]);
  return <main className="page"><div className="page-header"><div><p className="eyebrow">Saldo</p><h1>{dictionary.transactions}</h1></div></div><TransactionList events={events} language={language} dictionary={dictionary} searchable /></main>;
}
