import { getEvents, getReportReferenceData, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { buildCategoryReport, buildInvestmentHistory, buildInvestmentResult, buildMonthlyReport } from "@/lib/finance/reports";
import { StatisticsDashboard } from "@/components/statistics-dashboard";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string; view?: string }> }) {
  const query = await searchParams;
  const today = new Date();
  const requestedYear = Number(query.year);
  const requestedMonth = Number(query.month);
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2200 ? requestedYear : today.getFullYear();
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : today.getMonth() + 1;
  const view = query.view === "month" ? "month" : "year";
  const rangeStart = view === "month" && month === 1 ? `${year - 1}-12-01` : `${year}-01-01`;
  const [{ language, dictionary }, settings, events] = await Promise.all([
    getDictionary(), getSettings(), getEvents(5000, rangeStart, `${year + 1}-01-01`)
  ]);
  const currency = settings?.display_currency ?? "RSD";
  const eventCurrencies = [...new Set(events.flatMap((event) => event.entries.map((entry) => entry.currency)))];
  const primaryReference = await getReportReferenceData(currency, eventCurrencies, year);
  const previousReference = view === "month" && month === 1
    ? await getReportReferenceData(currency, eventCurrencies, year - 1)
    : null;
  const rates = previousReference ? [...previousReference.rates, ...primaryReference.rates].sort((a, b) => a.rate_date.localeCompare(b.rate_date) || Number(a.is_actual) - Number(b.is_actual)) : primaryReference.rates;
  const report = buildMonthlyReport(events, rates, currency, year);
  const previousYearReport = view === "month" && month === 1 ? buildMonthlyReport(events, rates, currency, year - 1) : null;
  const categories = buildCategoryReport(events, rates, currency, year, view === "month" ? month : undefined);
  const investments = buildInvestmentHistory(primaryReference.valuations, rates, currency, year);
  const periodStart = view === "month" ? `${year}-${String(month).padStart(2, "0")}-01` : `${year}-01-01`;
  const periodEndDate = view === "month" ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
  const periodEnd = `${periodEndDate.getUTCFullYear()}-${String(periodEndDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const investmentResult = buildInvestmentResult(events, primaryReference.valuations, rates, currency, periodStart, periodEnd);
  const previousExpenses = month === 1 ? (previousYearReport?.months[11]?.expenses ?? null) : report.months[month - 2]?.expenses ?? null;
  const missingRates = [...new Set([...report.missing, ...investments.missing, ...(investmentResult?.missing ?? [])])];
  return <main className="page"><StatisticsDashboard
    months={report.months}
    categories={categories}
    investmentMonths={investments.months}
    currency={currency}
    language={language}
    dictionary={dictionary}
    missingRates={missingRates}
    year={year}
    month={month}
    view={view}
    previousExpenses={previousExpenses}
    investmentResult={investmentResult}
  /></main>;
}
