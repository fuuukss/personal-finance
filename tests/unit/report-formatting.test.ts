import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { jsPDF } from "jspdf";
import { generateFinancialReportPdf, normalizePdfText } from "@/lib/finance/pdf-report";
import { percentageOfTotal } from "@/lib/finance/reports";

describe("report formatting", () => {
  it("normalizes Serbian category names for the built-in PDF font", () => {
    expect(normalizePdfText("Kafići i piće")).toBe("Kafici i pice");
    expect(normalizePdfText("Čišćenje, Đaci, Štednja, Život")).toBe("Ciscenje, Daci, Stednja, Zivot");
  });

  it("uses the same stable one-decimal category percentage calculation", () => {
    expect(percentageOfTotal("6020", "129021")).toBe("4.7");
    expect(percentageOfTotal("92182", "129021")).toBe("71.4");
    expect(percentageOfTotal("0", "0")).toBe("0.0");
  });

  it("generates a valid paginated long report", () => {
    const pdf = new jsPDF();
    generateFinancialReportPdf(pdf, {
      periodLabel: "novembar 2026",
      currency: "RSD",
      language: "sr-Latn",
      generatedLabel: "13.11.2026.",
      totalIncome: 123456789.75,
      totalExpenses: 98765432.1,
      netCashFlow: 24691357.65,
      missingRates: ["USD/RSD"],
      months: Array.from({ length: 12 }, (_, index) => ({
        label: `Mesec ${index + 1}`,
        income: 10000000 + index * 125000.5,
        expenses: 8250000 + index * 97500.25,
        balance: 1750000 + index * 27500.25,
      })),
      categories: Array.from({ length: 36 }, (_, index) => ({
        name: index === 0 ? "Kafići i piće" : `Veoma dugačak naziv kategorije ${index + 1}`,
        value: 3500000 - index * 41500.25,
      })),
    });
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const output = pdf.output("arraybuffer");
    expect(new TextDecoder().decode(output.slice(0, 5))).toBe("%PDF-");
    if (process.env.PDF_PREVIEW_PATH) writeFileSync(process.env.PDF_PREVIEW_PATH, Buffer.from(output));
  });
});
