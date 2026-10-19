import { describe, expect, it } from "vitest";
import { buildCategoryReport, buildMonthlyReport } from "@/lib/finance/reports";
import type { LedgerEvent } from "@/lib/finance/types";

const events: LedgerEvent[] = [
  { id: "1", event_type: "income", effective_date: "2026-01-05", description: null, transfer: null, entries: [{ id: "a", amount: "1000", currency: "EUR", account_id: "x", category_id: "salary", category: { name: "Salary", color: "#00ff00" } }] },
  { id: "2", event_type: "expense", effective_date: "2026-01-06", description: null, transfer: null, entries: [{ id: "b", amount: "-500", currency: "RSD", account_id: "y", category_id: "food", category: { name: "Food", color: "#ff0000" } }] },
  { id: "3", event_type: "transfer", effective_date: "2026-01-07", description: null, transfer: { source_account_id: "x", destination_account_id: "y", source_amount: "100", destination_amount: "11700", effective_rate: "117" }, entries: [{ id: "c", amount: "-100", currency: "EUR", account_id: "x", category_id: null }, { id: "d", amount: "11700", currency: "RSD", account_id: "y", category_id: null }] }
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
});
