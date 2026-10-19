"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/finance/money";

interface Month { label: string; income: number; expenses: number; balance: number; netWorth: number; }
interface Category { name: string; color: string; value: number; }

export function StatisticsDashboard({ months, categories, currency, language, dictionary: d, missingRates, year }: {
  months: Month[]; categories: Category[]; currency: string; language: Language; dictionary: Dictionary; missingRates: string[]; year: number;
}) {
  const [exporting, setExporting] = useState(false);
  async function exportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      pdf.setFontSize(20); pdf.text(`Saldo — ${year}`, 16, 20);
      pdf.setFontSize(10); pdf.setTextColor(100); pdf.text(`Currency: ${currency} · Generated ${new Date().toLocaleDateString()}`, 16, 29);
      pdf.setTextColor(20); pdf.setFontSize(12); pdf.text("Monthly cash flow", 16, 42);
      months.forEach((month, index) => pdf.text(`${month.label}: income ${month.income.toFixed(2)}, expenses ${month.expenses.toFixed(2)}, balance ${month.balance.toFixed(2)}`, 18, 51 + index * 7));
      let y = 143; pdf.text("Expense categories", 16, y); y += 9;
      categories.slice(0, 12).forEach((category) => { pdf.text(`${category.name}: ${category.value.toFixed(2)} ${currency}`, 18, y); y += 7; });
      if (missingRates.length) { pdf.setTextColor(180, 90, 20); pdf.text(`Incomplete: missing historical rates ${missingRates.join(", ")}`, 16, 270); }
      pdf.save(`saldo-report-${year}-${currency}.pdf`);
    } finally { setExporting(false); }
  }
  return <>
    <div className="page-header"><div><p className="eyebrow">{year}</p><h1>{d.statistics}</h1></div><button className="button secondary" disabled={exporting} onClick={exportPdf}><Download size={17} />{d.exportPdf}</button></div>
    {missingRates.length > 0 && <div className="card panel" style={{ color: "var(--warning)", marginBottom: "1rem" }}>Missing historical rates: {missingRates.join(", ")}. Totals exclude unconvertible entries.</div>}
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
      <ChartCard title={d.cashFlow}><ResponsiveContainer width="100%" height="100%"><BarChart data={months}><CartesianGrid stroke="#252c35" vertical={false} /><XAxis dataKey="label" stroke="#7c8796" /><YAxis stroke="#7c8796" /><Tooltip contentStyle={{ background: "#151a21", border: "1px solid #303846", borderRadius: 10 }} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /><Bar dataKey="income" fill="#35c98b" radius={[5,5,0,0]} /><Bar dataKey="expenses" fill="#ff6b73" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title={d.spendingByCategory}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={2}>{categories.map((category) => <Cell key={category.name} fill={category.color} />)}</Pie><Tooltip contentStyle={{ background: "#151a21", border: "1px solid #303846", borderRadius: 10 }} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /></PieChart></ResponsiveContainer></ChartCard>
      <div style={{ gridColumn: "1 / -1" }}><ChartCard title={d.netWorthHistory}><ResponsiveContainer width="100%" height="100%"><LineChart data={months}><CartesianGrid stroke="#252c35" vertical={false} /><XAxis dataKey="label" stroke="#7c8796" /><YAxis stroke="#7c8796" /><Tooltip contentStyle={{ background: "#151a21", border: "1px solid #303846", borderRadius: 10 }} formatter={(value) => formatMoney(Number(value ?? 0), currency, language)} /><Line type="monotone" dataKey="netWorth" stroke="#6e97ff" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></ChartCard></div>
    </div>
  </>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card panel"><h2>{title}</h2><div className="chart-wrap">{children}</div></section>; }
