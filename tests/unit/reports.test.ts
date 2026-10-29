import { describe, expect, it } from "vitest";
import { buildCategoryReport, buildInvestmentHistory, buildInvestmentResult, buildMonthlyReport } from "@/lib/finance/reports";
import type { LedgerEvent } from "@/lib/finance/types";

const events: LedgerEvent[] = [
  { id: "1", event_type: "income", effective_date: "2026-01-05", updated_at: "2026-01-05T12:00:00Z", description: null, transfer: null, entries: [{ id: "a", amount: "1000", currency: "EUR", account_id: "x", category_id: "salary", category: { name: "Salary", color: "#00ff00" } }] },
  { id: "2", event_type: "expense", effective_date: "2026-01-06", updated_at: "2026-01-06T12:00:00Z", description: null, transfer: null, entries: [{ id: "b", amount: "-500", currency: "RSD", account_id: "y", category_id: "food", category: { name: "Food", color: "#ff0000" } }] },
  { id: "3", event_type: "transfer", effective_date: "2026-01-07", updated_at: "2026-01-07T12:00:00Z", description: null, transfer: { source_account_id: "x", destination_account_id: "y", source_amount: "100", destination_amount: "11700", effective_rate: "117" }, entries: [{ id: "c", amount: "-100", currency: "EUR", account_id: "x", category_id: null }, { id: "d", amount: "11700", currency: "RSD", account_id: "y", category_id: null }] }
];
const rates = [{ base_currency: "EUR", quote_currency: "RSD", rate: "117", rate_date: "2026-01-01" }];

describe("historical reports", () => {
  it("excludes transfers from income and expenses", () => {
    const january = buildMonthlyReport(events, rates, "RSD", 2026).months[0]!;
    expect(january.income).toBe(117000);
    expect(january.expenses).toBe(500);
    expect(january.balance).toBe(116500);
  });

  it("keeps a cross-currency transfer net-worth neutral at its recorded rate", () => {
    const january = buildMonthlyReport(events, rates, "RSD", 2026).months[0]!;
    expect(january.netWorth).toBe(116500);
  });

  it("attributes expenses to their preserved category", () => {
    expect(buildCategoryReport(events, rates, "RSD", 2026)).toEqual([{ name: "Food", color: "#ff0000", value: 500 }]);
  });

  it("reports missing historical conversion data", () => {
    expect(buildMonthlyReport(events, [], "USD", 2026).missing).toContain("EUR/USD");
  });

  it("can scope category totals to one selected month", () => {
    expect(buildCategoryReport(events, rates, "RSD", 2026, 2)).toEqual([]);
    expect(buildCategoryReport(events, rates, "RSD", 2026, 1)[0]?.value).toBe(500);
  });

  it("carries the latest investment valuation through later months", () => {
    const history = buildInvestmentHistory([
      { account_id: "ibkr", amount: "1000", currency: "EUR", valuation_date: "2026-01-15" },
      { account_id: "ibkr", amount: "1100", currency: "EUR", valuation_date: "2026-03-10" },
    ], rates, "RSD", 2026);
    expect(history.months[0]?.value).toBe(117000);
    expect(history.months[1]?.value).toBe(117000);
    expect(history.months[2]?.value).toBe(128700);
  });

  it("separates investment performance from contributions", () => {
    const investmentEvents: LedgerEvent[] = [{
      id: "investment-transfer", event_type: "investment_contribution", effective_date: "2026-02-01", updated_at: "2026-02-01T12:00:00Z", description: null, transfer: null,
      entries: [{ id: "investment-entry", amount: "200", currency: "EUR", account_id: "ibkr", category_id: null }],
    }];
    const result = buildInvestmentResult(investmentEvents, [
      { account_id: "ibkr", amount: "1000", currency: "EUR", valuation_date: "2025-12-31" },
      { account_id: "ibkr", amount: "1300", currency: "EUR", valuation_date: "2026-03-31" },
    ], [{ base_currency: "EUR", quote_currency: "RSD", rate: "117", rate_date: "2025-12-15" }, ...rates], "RSD", "2026-01-01", "2027-01-01");
    expect(result?.endingValue).toBe(152100);
    expect(result?.result).toBe(11700);
  });

  it("does not invent an investment result without a valuation in the period", () => {
    expect(buildInvestmentResult([], [
      { account_id: "ibkr", amount: "1000", currency: "EUR", valuation_date: "2025-12-31" },
    ], rates, "RSD", "2026-01-01", "2027-01-01")).toBeNull();
  });
});
