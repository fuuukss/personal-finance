"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/finance/money";

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
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(Date.UTC(2026, index, 1))),
  })), [months, locale]);
  const selected = localizedMonths[month - 1]!;
  const annualIncome = localizedMonths.reduce((sum, item) => sum + item.income, 0);
  const annualExpenses = localizedMonths.reduce((sum, item) => sum + item.expenses, 0);
  const annualDifference = annualIncome - annualExpenses;
  const expenseComparison = previousExpenses === null ? null : selected.expenses - previousExpenses;
  const categoryTotal = categories.reduce((sum, category) => sum + category.value, 0);
  const investmentChart = investmentMonths.map((item, index) => ({ ...item, label: localizedMonths[index]?.label ?? String(item.month) }));
  const periodLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));

  async function exportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      pdf.setFontSize(20); pdf.text(`Saldo — ${year}`, 16, 20);
      pdf.setFontSize(10); pdf.setTextColor(100); pdf.text(`Currency: ${currency} · Generated ${new Date().toLocaleDateString(locale)}`, 16, 29);
      pdf.setTextColor(20); pdf.setFontSize(12); pdf.text("Monthly cash flow", 16, 42);
      localizedMonths.forEach((item, index) => pdf.text(`${item.label}: income ${item.income.toFixed(2)}, expenses ${item.expenses.toFixed(2)}, balance ${item.balance.toFixed(2)}`, 18, 51 + index * 7));
      let y = 143; pdf.text("Expense categories", 16, y); y += 9;
      categories.slice(0, 12).forEach((category) => { pdf.text(`${category.name}: ${category.value.toFixed(2)} ${currency}`, 18, y); y += 7; });
      if (missingRates.length) { pdf.setTextColor(180, 90, 20); pdf.text(`Incomplete: missing historical rates ${missingRates.join(", ")}`, 16, 270); }
      pdf.save(`saldo-report-${year}-${currency}.pdf`);
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
      {view === "year" && <ChartCard title={d.cashFlow}><ResponsiveContainer width="100%" height="100%"><BarChart data={localizedMonths}><CartesianGrid stroke="#252c35" vertical={false} /><XAxis dataKey="label" stroke="#7c8796" fontSize={11} /><YAxis stroke="#7c8796" width={52} tickFormatter={(value) => compactNumber(Number(value), locale)} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /><Bar dataKey="income" fill="#35c98b" radius={[4,4,0,0]} /><Bar dataKey="expenses" fill="#ff6b73" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></ChartCard>}
      <CategoryChart categories={categories} total={categoryTotal} currency={currency} language={language} dictionary={d} />
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

function CategoryChart({ categories, total, currency, language, dictionary: d }: { categories: Category[]; total: number; currency: string; language: Language; dictionary: Dictionary }) {
  if (categories.length === 0) return <section className="card panel chart-card"><h2>{d.spendingByCategory}</h2><div className="empty compact-empty">{d.noData}</div></section>;
  return <section className="card panel chart-card category-chart-card"><h2>{d.spendingByCategory}</h2><div className="category-chart-layout">
    <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={categories.length > 1 ? 2 : 0} stroke="none">{categories.map((category) => <Cell key={category.name} fill={category.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /></PieChart></ResponsiveContainer><div className="donut-total"><span>{d.total}</span><strong>{formatMoney(total, currency, language)}</strong></div></div>
    <div className="category-legend">{categories.map((category) => <div className="category-legend-row" key={category.name}><span className="category-dot" style={{ background: category.color }} /><span className="category-legend-name">{category.name}</span><span>{formatMoney(category.value, currency, language)}</span><small>{total > 0 ? `${((category.value / total) * 100).toFixed(1)}%` : "0%"}</small></div>)}</div>
  </div></section>;
}
