import { describe, expect, it } from "vitest";
import { calculateAdjustment, convert, effectiveRate, formatDecimal, formatMoney, investmentProfitLoss, money, roundMoney, sumMoney } from "@/lib/finance/money";
import { spendingMoneyTotal } from "@/lib/finance/summary";
import type { Account } from "@/lib/finance/types";

describe("exact money arithmetic", () => {
  it("subtracts an expense without binary floating point drift", () => {
    expect(money("20000").minus("500").toFixed(2)).toBe("19500.00");
  });

  it("creates an explicit reconciliation delta", () => {
    expect(calculateAdjustment("19500", "18000").toFixed(2)).toBe("-1500.00");
  });

  it("uses bankers rounding at currency precision", () => {
    expect(roundMoney("1.005", "EUR").toFixed(2)).toBe("1.00");
    expect(roundMoney("1.015", "EUR").toFixed(2)).toBe("1.02");
  });

  it("converts using decimal multiplication", () => {
    expect(convert("12000", "0.008333333333", "EUR").toFixed(2)).toBe("100.00");
  });

  it("calculates the actual effective transfer rate", () => {
    expect(effectiveRate("12000", "100").toFixed(12)).toBe("0.008333333333");
  });

  it("rejects a non-positive source amount", () => {
    expect(() => effectiveRate("0", "100")).toThrow();
  });

  it("sums decimal inputs exactly", () => {
    expect(sumMoney(["0.1", "0.2", "0.3"]).toFixed(2)).toBe("0.60");
  });

  it("separates investment profit from contributions and withdrawals", () => {
    expect(investmentProfitLoss("1450", "1200", "100").toFixed(2)).toBe("350.00");
  });

  it("formats Serbian amounts with exact separators and currency placement", () => {
    expect(formatMoney("100000", "RSD", "sr-Latn")).toBe("100.000,00 RSD");
    expect(formatMoney("-100000.5", "EUR", "sr-Latn")).toBe("-100.000,50 EUR");
  });

  it("formats English amounts without converting through an unsafe JavaScript number", () => {
    expect(formatMoney("9007199254740993.25", "USD", "en")).toBe("USD 9,007,199,254,740,993.25");
    expect(formatDecimal("100000.5", "en", 2)).toBe("100,000.50");
  });

  it("keeps everyday spending separate from savings and investments", () => {
    const accounts: Account[] = [
      { id: "1", name: "RSD Cash", currency: "RSD", kind: "cash", sort_order: 0, archived_at: null, balance: "1000" },
      { id: "2", name: "RSD Card", currency: "RSD", kind: "bank", sort_order: 1, archived_at: null, balance: "2000" },
      { id: "3", name: "EUR Savings", currency: "EUR", kind: "savings", sort_order: 2, archived_at: null, balance: "500" },
      { id: "4", name: "IBKR", currency: "EUR", kind: "investment", sort_order: 3, archived_at: null, balance: "0", latest_valuation: "3000" },
    ];
    expect(spendingMoneyTotal(accounts).toFixed(2)).toBe("3000.00");
  });
});
