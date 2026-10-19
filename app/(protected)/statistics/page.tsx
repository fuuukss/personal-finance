import { getEvents, getReportReferenceData, getSettings } from "@/lib/data";
import { getDictionary } from "@/lib/i18n/server";
import { buildCategoryReport, buildMonthlyReport } from "@/lib/finance/reports";
import { StatisticsDashboard } from "@/components/statistics-dashboard";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const requested = Number((await searchParams).year);
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2200 ? requested : new Date().getFullYear();
  const [{ language, dictionary }, settings, events] = await Promise.all([getDictionary(), getSettings(), getEvents(5000)]);
  const currency = settings?.display_currency ?? "RSD";
  const { rates } = await getReportReferenceData(currency);
  const report = buildMonthlyReport(events, rates, currency, year);
  const categories = buildCategoryReport(events, rates, currency, year);
  return <main className="page"><StatisticsDashboard months={report.months} categories={categories} currency={currency} language={language} dictionary={dictionary} missingRates={report.missing} year={year} /></main>;
}
