import Link from "next/link";
import Decimal from "decimal.js";
import { getAccounts, getCategories, getEvents, getReportReferenceData, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { TransactionList } from "@/components/transaction-list";
import { buildMonthlyReport } from "@/lib/finance/reports";
import { formatMoney } from "@/lib/finance/money";

type KindFilter = "expense" | "income" | "all";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ kind?: string; year?: string; month?: string; all?: string }> }) {
  const query = await searchParams;
  const today = new Date();
  const requestedYear = Number(query.year);
  const requestedMonth = Number(query.month);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2200 ? requestedYear : today.getFullYear();
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : today.getMonth() + 1;
  const kind: KindFilter = query.kind === "expense" || query.kind === "income" ? query.kind : "all";
  const showAll = query.all === "1";
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextDate = new Date(Date.UTC(year, month, 1));
  const end = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const [{ language, dictionary: d }, events, accounts, categories, settings] = await Promise.all([
    getDictionary(), showAll ? getEvents(5000) : getEvents(5000, start, end), getAccounts(), getCategories(), getSettings()
  ]);
  const visibleEvents = kind === "all" ? events : events.filter((event) => event.event_type === kind);
  const currency = settings?.display_currency ?? "RSD";
  const eventCurrencies = [...new Set(visibleEvents.flatMap((event) => event.entries.map((entry) => entry.currency)))];
  const { rates } = await getReportReferenceData(currency, eventCurrencies, year);
  const report = buildMonthlyReport(visibleEvents, rates, currency, year);
  const selected = report.months[month - 1]!;
  const total = kind === "expense" ? new Decimal(selected.expenses) : kind === "income" ? new Decimal(selected.income) : null;
  const locale = language === "sr-Latn" ? "sr-Latn-RS" : "en-US";
  const periodLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const following = new Date(Date.UTC(year, month, 1));
  const periodHref = (target: Date, targetKind = kind) => `/transactions?kind=${targetKind}&year=${target.getUTCFullYear()}&month=${target.getUTCMonth() + 1}`;

  return <main className="page">
    <div className="page-header compact-header"><div><p className="eyebrow">{showAll ? d.completeHistory : periodLabel}</p><h1>{d.transactions}</h1></div></div>
    <div className="period-toolbar">
      <Link className="button secondary compact-button" href={periodHref(previous)} aria-label={d.previous}>‹</Link>
      <form className="period-form" method="get">
        <input type="hidden" name="kind" value={kind} />
        <select className="input" name="month" defaultValue={month} aria-label={d.month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(Date.UTC(2026, index, 1)))}</option>)}</select>
        <input className="input year-input" name="year" type="number" min="2000" max="2200" defaultValue={year} aria-label={d.year} />
        <button className="button compact-button">{d.show}</button>
      </form>
      <Link className="button secondary compact-button" href={periodHref(following)} aria-label={d.next}>›</Link>
    </div>
    <nav className="filter-tabs" aria-label={d.transactionType}>
      <Link className={kind === "all" && !showAll ? "active" : ""} href={periodHref(new Date(Date.UTC(year, month - 1, 1)), "all")}>{d.allTypes}</Link>
      <Link className={kind === "expense" && !showAll ? "active" : ""} href={periodHref(new Date(Date.UTC(year, month - 1, 1)), "expense")}>{d.expenses}</Link>
      <Link className={kind === "income" && !showAll ? "active" : ""} href={periodHref(new Date(Date.UTC(year, month - 1, 1)), "income")}>{d.income}</Link>
      <Link className={showAll ? "active" : ""} href="/transactions?all=1">{d.completeHistory}</Link>
    </nav>
    {total && <section className="card period-total"><span>{d.total}</span><strong className="amount">{formatMoney(total, currency, language)}</strong></section>}
    {report.missing.length > 0 && <div className="card compact-warning">{d.incompleteMonthlySummary} {d.missingRates}: {report.missing.join(", ")}.</div>}
    <TransactionList events={visibleEvents} accounts={accounts} categories={categories} language={language} dictionary={d} searchable />
  </main>;
}
