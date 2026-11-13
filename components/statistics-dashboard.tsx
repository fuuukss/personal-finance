"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/finance/money";
import { generateFinancialReportPdf } from "@/lib/finance/pdf-report";
import { percentageOfTotal } from "@/lib/finance/reports";

interface Month { label: string; income: number; expenses: number; balance: number; netWorth: number; }
interface Category { name: string; color: string; value: number; }

export function StatisticsDashboard({ months, categories, investmentMonths, investmentResult, currency, language, dictionary: d, missingRates, year, month, view, previousExpenses }: {
  months: Month[];
  categories: Category[];
  investmentMonths: Array<{ month: number; value: number }>;
  currency: string;
  language: Language;
  dictionary: Dictionary;
  missingRates: string[];
  year: number;
  month: number;
  view: "year" | "month";
  previousExpenses: number | null;
  investmentResult: { endingValue: number; result: number; missing: string[] } | null;
}) {
  const [exporting, setExporting] = useState(false);
  const locale = language === "sr-Latn" ? "sr-Latn-RS" : "en-US";
  const localizedMonths = useMemo(() => months.map((item, index) => ({
    ...item,
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(Date.UTC(year, index, 1))),
  })), [months, locale, year]);
  const selected = localizedMonths[month - 1]!;
  const annualIncome = localizedMonths.reduce((sum, item) => sum + item.income, 0);
  const annualExpenses = localizedMonths.reduce((sum, item) => sum + item.expenses, 0);
  const annualDifference = annualIncome - annualExpenses;
  const expenseComparison = previousExpenses === null ? null : selected.expenses - previousExpenses;
  const categoryTotal = categories.reduce((sum, category) => sum + category.value, 0);
  const investmentChart = investmentMonths.map((item, index) => ({ ...item, label: localizedMonths[index]?.label ?? String(item.month) }));
  const periodLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const reportPeriodLabel = view === "year" ? String(year) : periodLabel;

  async function exportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      const totalIncome = view === "year" ? annualIncome : selected.income;
      const totalExpenses = view === "year" ? annualExpenses : selected.expenses;
      generateFinancialReportPdf(pdf, {
        periodLabel: reportPeriodLabel,
        currency,
        language,
        generatedLabel: new Date().toLocaleDateString(locale),
        months: localizedMonths,
        categories,
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        missingRates,
      });
      pdf.save(`saldo-report-${view === "year" ? year : `${year}-${String(month).padStart(2, "0")}`}-${currency}.pdf`);
    } finally { setExporting(false); }
  }

  return <>
    <div className="page-header compact-header"><div><p className="eyebrow">{view === "month" ? periodLabel : year}</p><h1>{d.statistics}</h1></div></div>
    <div className="period-toolbar statistics-period-toolbar">
      <Link className="button secondary compact-button" href={`/statistics?view=${view}&year=${year - 1}&month=${month}`}>‹</Link>
      <form className="period-form" method="get"><input type="hidden" name="view" value={view} /><select className="input" name="month" defaultValue={month} aria-label={d.month}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(Date.UTC(2026, index, 1)))}</option>)}</select><input className="input year-input" name="year" type="number" min="2000" max="2200" defaultValue={year} aria-label={d.year} /><button className="button compact-button">{d.show}</button></form>
      <Link className="button secondary compact-button" href={`/statistics?view=${view}&year=${year + 1}&month=${month}`}>›</Link>
    </div>
    <nav className="filter-tabs"><Link className={view === "year" ? "active" : ""} href={`/statistics?view=year&year=${year}&month=${month}`}>{d.yearlyView}</Link><Link className={view === "month" ? "active" : ""} href={`/statistics?view=month&year=${year}&month=${month}`}>{d.monthlyView}</Link></nav>
    {missingRates.length > 0 && <div className="card compact-warning">{d.incompleteMonthlySummary} {d.missingRates}: {missingRates.join(", ")}.</div>}

    <section className="report-summary-grid">
      <Summary label={view === "year" ? d.annualIncome : d.income} value={formatMoney(view === "year" ? annualIncome : selected.income, currency, language)} tone="positive" />
      <Summary label={view === "year" ? d.annualExpenses : d.expenses} value={formatMoney(view === "year" ? annualExpenses : selected.expenses, currency, language)} tone="negative" />
      <Summary label={d.savingsChange} value={formatMoney(view === "year" ? annualDifference : selected.balance, currency, language)} tone={(view === "year" ? annualDifference : selected.balance) < 0 ? "negative" : "positive"} />
      {view === "month" && <Summary label={d.previousMonthComparison} value={expenseComparison === null ? "—" : formatMoney(expenseComparison, currency, language)} tone={expenseComparison !== null && expenseComparison > 0 ? "negative" : "positive"} />}
      {investmentResult && <Summary label={d.investmentValue} value={formatMoney(investmentResult.endingValue, currency, language)} tone="" />}
      {investmentResult && <Summary label={d.investmentResult} value={formatMoney(investmentResult.result, currency, language)} tone={investmentResult.result < 0 ? "negative" : "positive"} />}
    </section>

    <div className="report-grid">
      <CategoryChart categories={categories} total={categoryTotal} currency={currency} language={language} dictionary={d} />
      {view === "year" && <CashFlowChart months={localizedMonths} currency={currency} language={language} locale={locale} dictionary={d} />}
      {view === "year" && <ChartCard title={d.netWorthChange}><ResponsiveContainer width="100%" height="100%"><LineChart data={localizedMonths}><CartesianGrid stroke="#252c35" vertical={false} /><XAxis dataKey="label" stroke="#7c8796" fontSize={11} /><YAxis stroke="#7c8796" width={52} tickFormatter={(value) => compactNumber(Number(value), locale)} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /><Line type="monotone" dataKey="netWorth" stroke="#6e97ff" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></ChartCard>}
      {view === "year" && investmentChart.some((item) => item.value !== 0) && <ChartCard title={d.investmentHistory}><ResponsiveContainer width="100%" height="100%"><LineChart data={investmentChart}><CartesianGrid stroke="#252c35" vertical={false} /><XAxis dataKey="label" stroke="#7c8796" fontSize={11} /><YAxis stroke="#7c8796" width={52} tickFormatter={(value) => compactNumber(Number(value), locale)} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /><Line type="monotone" dataKey="value" stroke="#b196ff" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></ChartCard>}
    </div>

    <details className="report-export"><summary>{d.reportOptions}</summary><button className="button secondary" disabled={exporting} onClick={exportPdf}><Download size={16} />{d.exportPdf}</button></details>
  </>;
}

const tooltipStyle = { background: "#151a21", border: "1px solid #303846", borderRadius: 10 };

function compactNumber(value: number, locale: string) { return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function Summary({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="card report-summary"><span>{label}</span><strong className={`amount ${tone}`}>{value}</strong></div>; }
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card panel chart-card"><h2>{title}</h2><div className="chart-wrap">{children}</div></section>; }

function CashFlowChart({ months, currency, language, locale, dictionary: d }: { months: Month[]; currency: string; language: Language; locale: string; dictionary: Dictionary }) {
  const directionalMonths = months.map((item) => ({ ...item, expenseFlow: -item.expenses }));
  return <ChartCard title={d.cashFlow}><ResponsiveContainer width="100%" height="100%"><LineChart data={directionalMonths} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
    <CartesianGrid stroke="#252c35" strokeDasharray="3 5" vertical={false} />
    <XAxis dataKey="label" stroke="#7c8796" fontSize={11} tickLine={false} axisLine={{ stroke: "#394250" }} />
    <YAxis stroke="#7c8796" width={52} tickLine={false} axisLine={false} tickFormatter={(value) => compactNumber(Number(value), locale)} />
    <ReferenceLine y={0} stroke="#556172" strokeWidth={1.2} />
    <Tooltip
      cursor={{ stroke: "#475569", strokeWidth: 1 }}
      contentStyle={tooltipStyle}
      formatter={(value, name) => [formatMoney(Math.abs(Number(value ?? 0)), currency, language), name === "expenseFlow" ? d.expenses : d.income]}
    />
    <Line type="monotoneX" dataKey="income" stroke="#35c98b" strokeWidth={2.5} dot={{ r: 2.5, fill: "#35c98b", strokeWidth: 0 }} activeDot={{ r: 4 }} />
    <Line type="monotoneX" dataKey="expenseFlow" stroke="#ff6b73" strokeWidth={2.5} dot={{ r: 2.5, fill: "#ff6b73", strokeWidth: 0 }} activeDot={{ r: 4 }} />
  </LineChart></ResponsiveContainer></ChartCard>;
}

function CategoryChart({ categories, total, currency, language, dictionary: d }: { categories: Category[]; total: number; currency: string; language: Language; dictionary: Dictionary }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (categories.length === 0) return <section className="card panel chart-card"><h2>{d.spendingByCategory}</h2><div className="empty compact-empty">{d.noData}</div></section>;
  const activeCategory = activeIndex === null ? null : categories[activeIndex] ?? null;
  return <section className="card panel chart-card category-chart-card"><h2>{d.spendingByCategory}</h2><div className="category-chart-layout">
    <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={categories.length > 1 ? 2 : 0} stroke="none" onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onClick={(_, index) => setActiveIndex(index)}>{categories.map((category) => <Cell key={category.name} fill={category.color} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-total"><span title={activeCategory?.name}>{activeCategory?.name ?? d.total}</span><strong>{formatMoney(activeCategory?.value ?? total, currency, language)}</strong>{activeCategory && <small>{percentageOfTotal(activeCategory.value, total)}%</small>}</div></div>
    <div className="category-legend">{categories.map((category) => <div className="category-legend-row" key={category.name}><span className="category-dot" style={{ background: category.color }} /><div className="category-legend-details"><span className="category-legend-name">{category.name}</span><small>{percentageOfTotal(category.value, total)}%</small></div><span className="category-legend-amount">{formatMoney(category.value, currency, language)}</span></div>)}</div>
  </div></section>;
}
