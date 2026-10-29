import { redirect } from "next/navigation";
import Link from "next/link";
import Decimal from "decimal.js";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { getAccounts, getCategories, getEvents, getExchangeRates, getReportReferenceData, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { accountDisplayValue, spendingMoneyTotal } from "@/lib/finance/summary";
import { formatMoney } from "@/lib/finance/money";
import { buildMonthlyReport } from "@/lib/finance/reports";
import { CompactAccountList } from "@/components/compact-account-list";
import { TransactionList } from "@/components/transaction-list";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const query = await searchParams;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = Number(currentMonth.slice(0, 4));
  const yearStart = `${currentYear}-01-01`;
  const nextYearStart = `${currentYear + 1}-01-01`;
  const [{ language, dictionary: d }, settings, accounts, events, recentEvents, categories] = await Promise.all([
    getDictionary(), getSettings(), getAccounts(), getEvents(5000, yearStart, nextYearStart), getEvents(8), getCategories()
  ]);
  if (!settings?.onboarding_complete) redirect("/onboarding");
  const accountCurrencies = accounts.map((account) => account.currency);
  const rates = await getExchangeRates(settings.display_currency, accountCurrencies);
  const missingNetWorthCurrencies = new Set<string>();
  const netWorth = accounts.reduce((total, account) => {
    const rate = rates.get(account.currency);
    if (!rate) { missingNetWorthCurrencies.add(account.currency); return total; }
    return total.plus(accountDisplayValue(account, rate.rate));
  }, new Decimal(0));
  const { rates: historicalRates } = await getReportReferenceData(settings.display_currency, accountCurrencies, currentYear);
  const currentReport = buildMonthlyReport(events, historicalRates, settings.display_currency, currentYear);
  const currentReportMonth = currentReport.months[Number(currentMonth.slice(5, 7)) - 1]!;
  const missingReportPairs = currentReport.missing;
  const flow = { expenses: new Decimal(currentReportMonth.expenses), income: new Decimal(currentReportMonth.income), difference: new Decimal(currentReportMonth.balance) };
  const spendingMoney = spendingMoneyTotal(accounts);
  const currentTimestamp = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`).getTime();
  const staleInvestment = accounts.some((a) => a.kind === "investment" && (!a.valuation_date || currentTimestamp - new Date(`${a.valuation_date}T12:00:00`).getTime() > 31 * 86400000));
  const staleRates = [...rates.values()].filter((rate) => rate.stale && rate.base !== rate.quote).map((rate) => rate.base);
  return <main className="page">
    {query.setup === "complete" && <div className="card success-banner" role="status">{d.onboardingComplete}</div>}
    <div className="page-header compact-header"><div><p className="eyebrow">{d.thisMonth}</p><h1>{d.appName}</h1></div><span className="badge">{settings.display_currency}</span></div>
    <section className="wealth-grid">
      <div className="card wealth-card"><p className="wealth-label">{d.spendingMoney}</p><p className="wealth-value amount">{formatMoney(spendingMoney, "RSD", language)}</p></div>
      <div className="card wealth-card"><p className="wealth-label">{d.netWorth}</p><p className="wealth-value amount">{missingNetWorthCurrencies.size ? d.unavailable : formatMoney(netWorth, settings.display_currency, language)}</p><p className="wealth-note">{d.estimate}</p></div>
    </section>
    {(missingNetWorthCurrencies.size > 0 || missingReportPairs.length > 0 || staleRates.length > 0 || staleInvestment) && <div className="card compact-warning"><AlertTriangle size={17} /><span>{missingNetWorthCurrencies.size ? `${d.missingRates}: ${[...missingNetWorthCurrencies].join(", ")}. ` : ""}{missingReportPairs.length ? `${d.incompleteMonthlySummary} ` : ""}{staleRates.length ? `${d.staleRates}: ${staleRates.join(", ")}. ` : ""}{staleInvestment ? d.staleValuation : ""}</span></div>}
    <section className="stats-grid compact-stats">
      <Stat href={`/transactions?kind=expense&year=${currentYear}&month=${currentMonth.slice(5, 7)}`} icon={ArrowUpRight} label={d.expenses} value={formatMoney(flow.expenses, settings.display_currency, language)} tone="negative" />
      <Stat href={`/transactions?kind=income&year=${currentYear}&month=${currentMonth.slice(5, 7)}`} icon={ArrowDownRight} label={d.income} value={formatMoney(flow.income, settings.display_currency, language)} tone="positive" />
      <Stat icon={Equal} label={d.difference} value={formatMoney(flow.difference, settings.display_currency, language)} tone={flow.difference.isNegative() ? "negative" : "positive"} />
    </section>
    <div className="section-row compact-section-row"><h2>{d.allAccounts}</h2><Link className="text-link" href="/accounts">{d.seeAll}</Link></div>
    <CompactAccountList accounts={accounts} language={language} />
    <div className="section-row compact-section-row"><h2>{d.recentTransactions}</h2><Link className="text-link" href="/transactions">{d.seeAll}</Link></div>
    <TransactionList events={recentEvents} accounts={accounts} categories={categories} language={language} dictionary={d} editable={false} />
  </main>;
}

function Stat({ icon: Icon, label, value, tone, href }: { icon: typeof ArrowUpRight; label: string; value: string; tone: string; href?: string }) {
  const content = <><span className="compact-stat-icon"><Icon size={16} /></span><span className="compact-stat-label">{label}</span><span className={`compact-stat-value amount ${tone}`}>{value}</span></>;
  return href ? <Link className="card compact-stat" href={href}>{content}</Link> : <div className="card compact-stat">{content}</div>;
}
