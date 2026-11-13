import type { jsPDF } from "jspdf";
import { formatMoney } from "@/lib/finance/money";
import { percentageOfTotal } from "@/lib/finance/reports";
import type { Currency } from "@/lib/finance/types";
import type { Language } from "@/lib/i18n/dictionaries";

interface ReportMonth { label: string; income: number; expenses: number; balance: number; }
interface ReportCategory { name: string; value: number; }

export interface FinancialPdfReportData {
  periodLabel: string;
  currency: Currency;
  language: Language;
  generatedLabel: string;
  months: ReportMonth[];
  categories: ReportCategory[];
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  missingRates: string[];
}

interface TableColumn {
  header: string;
  width: number;
  align?: "left" | "right";
}

const PDF_TEXT_REPLACEMENTS: Record<string, string> = {
  č: "c", ć: "c", š: "s", ž: "z", đ: "d",
  Č: "C", Ć: "C", Š: "S", Ž: "Z", Đ: "D",
  "–": "-", "—": "-", "“": "\"", "”": "\"", "’": "'", " ": " ",
};

export function normalizePdfText(value: string) {
  return [...value]
    .map((character) => PDF_TEXT_REPLACEMENTS[character] ?? character)
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

export function generateFinancialReportPdf(pdf: jsPDF, data: FinancialPdfReportData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  function addPage() {
    pdf.addPage();
    pdf.setTextColor(70, 82, 102);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text("Saldo - Financial Report", margin, 11);
    pdf.setFont("helvetica", "normal");
    pdf.text(normalizePdfText(data.periodLabel), pageWidth - margin, 11, { align: "right" });
    pdf.setDrawColor(225, 229, 236);
    pdf.line(margin, 14, pageWidth - margin, 14);
    y = 20;
  }

  function ensureSpace(height: number) {
    if (y + height > pageHeight - 18) addPage();
  }

  function sectionTitle(title: string) {
    ensureSpace(14);
    pdf.setTextColor(25, 35, 55);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(normalizePdfText(title), margin, y);
    y += 7;
  }

  function tableHeader(columns: TableColumn[]) {
    pdf.setFillColor(235, 240, 249);
    pdf.rect(margin, y, contentWidth, 8, "F");
    pdf.setTextColor(55, 70, 95);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    let x = margin;
    for (const column of columns) {
      const textX = column.align === "right" ? x + column.width - 3 : x + 3;
      pdf.text(normalizePdfText(column.header), textX, y + 5.3, { align: column.align ?? "left" });
      x += column.width;
    }
    y += 8;
  }

  function drawTable(title: string, columns: TableColumn[], rows: string[][]) {
    ensureSpace(22);
    sectionTitle(title);
    tableHeader(columns);
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) => {
        const column = columns[index]!;
        return pdf.splitTextToSize(normalizePdfText(cell), Math.max(8, column.width - 6)) as string[];
      });
      const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
      const rowHeight = Math.max(7.2, 3 + lineCount * 4);
      if (y + rowHeight > pageHeight - 18) {
        addPage();
        tableHeader(columns);
      }
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(249, 250, 252);
        pdf.rect(margin, y, contentWidth, rowHeight, "F");
      }
      pdf.setDrawColor(222, 227, 235);
      pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      pdf.setTextColor(35, 43, 56);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      let x = margin;
      wrapped.forEach((lines, index) => {
        const column = columns[index]!;
        const textX = column.align === "right" ? x + column.width - 3 : x + 3;
        pdf.text(lines, textX, y + 5.2, { align: column.align ?? "left", lineHeightFactor: 1.15 });
        x += column.width;
      });
      y += rowHeight;
    });
    y += 9;
  }

  function drawWarning(message: string) {
    const lines = pdf.splitTextToSize(normalizePdfText(message), contentWidth - 8) as string[];
    const height = Math.max(13, 7 + lines.length * 4);
    ensureSpace(height + 8);
    pdf.setFillColor(255, 247, 228);
    pdf.roundedRect(margin, y, contentWidth, height, 2, 2, "F");
    pdf.setTextColor(140, 91, 15);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(lines, margin + 4, y + 7, { lineHeightFactor: 1.15 });
    y += height + 9;
  }

  pdf.setFillColor(24, 40, 77);
  pdf.rect(0, 0, pageWidth, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("Saldo", margin, 16);
  pdf.setFontSize(11);
  pdf.text("Financial Report", margin, 24);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(205, 217, 244);
  pdf.text(normalizePdfText(data.periodLabel), pageWidth - margin, 14, { align: "right" });
  pdf.text(`Currency: ${normalizePdfText(data.currency)}`, pageWidth - margin, 21, { align: "right" });
  pdf.text(`Generated: ${normalizePdfText(data.generatedLabel)}`, pageWidth - margin, 28, { align: "right" });
  y = 49;

  drawTable("Financial summary", [
    { header: "Metric", width: contentWidth * 0.58 },
    { header: "Amount", width: contentWidth * 0.42, align: "right" },
  ], [
    ["Total income", formatMoney(data.totalIncome, data.currency, data.language)],
    ["Total expenses", formatMoney(data.totalExpenses, data.currency, data.language)],
    ["Net cash flow", formatMoney(data.netCashFlow, data.currency, data.language)],
  ]);

  if (data.missingRates.length) {
    drawWarning(`Incomplete report: missing historical rates ${data.missingRates.join(", ")}.`);
  }

  const categoryTotal = data.categories.reduce((sum, category) => sum + category.value, 0);
  const categoryRows = data.categories.length
    ? data.categories.map((category) => [
        category.name,
        formatMoney(category.value, data.currency, data.language),
        `${percentageOfTotal(category.value, categoryTotal)}%`,
      ])
    : [["No expense data", "-", "0.0%"]];
  drawTable("Expense categories", [
    { header: "Category", width: contentWidth * 0.5 },
    { header: "Amount", width: contentWidth * 0.33, align: "right" },
    { header: "Share", width: contentWidth * 0.17, align: "right" },
  ], categoryRows);

  drawTable("Monthly cash flow", [
    { header: "Month", width: contentWidth * 0.22 },
    { header: "Income", width: contentWidth * 0.26, align: "right" },
    { header: "Expenses", width: contentWidth * 0.26, align: "right" },
    { header: "Net", width: contentWidth * 0.26, align: "right" },
  ], data.months.map((month) => [
    month.label,
    formatMoney(month.income, data.currency, data.language),
    formatMoney(month.expenses, data.currency, data.language),
    formatMoney(month.balance, data.currency, data.language),
  ]));

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 229, 236);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    pdf.setTextColor(120, 128, 140);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(`Saldo - Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }
}
