import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { getAccounts, getCategories, getEvents, getExchangeRates, getReportReferenceData, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { accountDisplayValue } from "@/lib/finance/summary";
import { formatMoney } from "@/lib/finance/money";
import { buildMonthlyReport } from "@/lib/finance/reports";
import { AccountCard } from "@/components/account-card";
import { TransactionList } from "@/components/transaction-list";

export default async function DashboardPage() {
  const [{ language, dictionary: d }, settings, accounts, events, categories] = await Promise.all([getDictionary(), getSettings(), getAccounts(), getEvents(5000), getCategories()]);
  if (!settings?.onboarding_complete) redirect("/onboarding");
  const accountCurrencies = accounts.map((account) => account.currency);
  const rates = await getExchangeRates(settings.display_currency, accountCurrencies);
  const missingCurrencies = new Set<string>();
  const netWorth = accounts.reduce((total, account) => {
    const rate = rates.get(account.currency);
    if (!rate) { missingCurrencies.add(account.currency); return total; }
    return total.plus(accountDisplayValue(account, rate.rate));
  }, new Decimal(0));
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = Number(currentMonth.slice(0, 4));
  const { rates: historicalRates } = await getReportReferenceData(settings.display_currency, accountCurrencies, currentYear);
  const currentReport = buildMonthlyReport(events, historicalRates, settings.display_currency, currentYear);
  const currentReportMonth = currentReport.months[Number(currentMonth.slice(5, 7)) - 1]!;
  currentReport.missing.forEach((pair) => missingCurrencies.add(pair.split("/")[0]!));
  const flow = { expenses: new Decimal(currentReportMonth.expenses), income: new Decimal(currentReportMonth.income), difference: new Decimal(currentReportMonth.balance) };
  const currentTimestamp = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`).getTime();
  const staleInvestment = accounts.some((a) => a.kind === "investment" && (!a.valuation_date || currentTimestamp - new Date(`${a.valuation_date}T12:00:00`).getTime() > 31 * 86400000));
  const staleRates = [...rates.values()].filter((rate) => rate.stale && rate.base !== rate.quote).map((rate) => rate.base);
  return <main className="page">
    <div className="page-header"><div><p className="eyebrow">{d.thisMonth}</p><h1>{d.home}</h1></div><span className="badge">{settings.display_currency}</span></div>
    <section className="card hero"><p className="hero-label">{d.netWorth}</p><p className="hero-value amount">{formatMoney(netWorth, settings.display_currency, language)}</p><p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{d.estimate}</p></section>
    {(missingCurrencies.size > 0 || staleRates.length > 0 || staleInvestment) && <div className="card panel" style={{ marginTop: "1rem", display: "flex", gap: ".7rem", color: "var(--warning)" }}><AlertTriangle size={18} /><span>{missingCurrencies.size ? `Missing ${[...missingCurrencies].join(", ")} exchange rate. ` : ""}{staleRates.length ? `Stale ${staleRates.join(", ")} exchange rate. ` : ""}{staleInvestment ? d.staleValuation : ""}</span></div>}
    <section className="grid stats-grid" style={{ marginTop: "1rem" }}>
      <Stat icon={ArrowUpRight} label={d.expenses} value={formatMoney(flow.expenses, settings.display_currency, language)} tone="negative" />
      <Stat icon={ArrowDownRight} label={d.income} value={formatMoney(flow.income, settings.display_currency, language)} tone="positive" />
      <Stat icon={Equal} label={d.difference} value={formatMoney(flow.difference, settings.display_currency, language)} tone={flow.difference.isNegative() ? "negative" : "positive"} />
    </section>
    <div className="section-row"><h2>{d.allAccounts}</h2><a className="text-link" href="/accounts">{d.seeAll}</a></div>
    <section className="grid accounts-grid">{accounts.map((account) => <AccountCard key={account.id} account={account} language={language} />)}</section>
    <div className="section-row"><h2>{d.recentTransactions}</h2><a className="text-link" href="/transactions">{d.seeAll}</a></div>
    <TransactionList events={events.slice(0, 8)} accounts={accounts} categories={categories} language={language} dictionary={d} />
  </main>;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof ArrowUpRight; label: string; value: string; tone: string }) {
  return <div className="card panel"><div className="icon-box"><Icon size={18} /></div><p className="muted" style={{ margin: ".9rem 0 .3rem", fontSize: ".8rem" }}>{label}</p><p className={`account-balance amount ${tone}`}>{value}</p></div>;
}
