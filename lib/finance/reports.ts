import Decimal from "decimal.js";
import type { LedgerEvent } from "@/lib/finance/types";

interface RateRow { base_currency: string; quote_currency: string; rate: string; rate_date: string; }

function rateAt(rates: RateRow[], base: string, quote: string, date: string) {
  if (base === quote) return new Decimal(1);
  let selected: RateRow | undefined;
  for (const rate of rates) if (rate.base_currency === base && rate.quote_currency === quote && rate.rate_date <= date) selected = rate;
  return selected ? new Decimal(selected.rate) : null;
}

export function buildMonthlyReport(events: LedgerEvent[], rates: RateRow[], displayCurrency: string, year: number) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    key: `${year}-${String(index + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(year, index, 1)),
    income: new Decimal(0), expenses: new Decimal(0), netWorthChange: new Decimal(0)
  }));
  const missing = new Set<string>();
  for (const event of events) {
    if (!event.effective_date.startsWith(String(year))) continue;
    const month = months[Number(event.effective_date.slice(5, 7)) - 1];
    if (!month) continue;
    for (const entry of event.entries) {
      const rate = rateAt(rates, entry.currency, displayCurrency, event.effective_date);
      if (!rate) { missing.add(`${entry.currency}/${displayCurrency}`); continue; }
      const value = new Decimal(entry.amount).mul(rate);
      month.netWorthChange = month.netWorthChange.plus(value);
      if (event.event_type === "expense") month.expenses = month.expenses.plus(value.abs());
      if (event.event_type === "income") month.income = month.income.plus(value);
    }
  }
  let cumulative = new Decimal(0);
  return {
    missing: [...missing],
    months: months.map((month) => {
      cumulative = cumulative.plus(month.netWorthChange);
      return { label: month.label, income: month.income.toNumber(), expenses: month.expenses.toNumber(), balance: month.income.minus(month.expenses).toNumber(), netWorth: cumulative.toNumber() };
    })
  };
}

export function buildCategoryReport(events: LedgerEvent[], rates: RateRow[], displayCurrency: string, year: number) {
  const values = new Map<string, { name: string; color: string; value: Decimal }>();
  for (const event of events) {
    if (event.event_type !== "expense" || !event.effective_date.startsWith(String(year))) continue;
    for (const entry of event.entries) {
      const rate = rateAt(rates, entry.currency, displayCurrency, event.effective_date);
      if (!rate) continue;
      const name = entry.category?.name ?? "Other";
      const current = values.get(name) ?? { name, color: entry.category?.color ?? "#64748b", value: new Decimal(0) };
      current.value = current.value.plus(new Decimal(entry.amount).abs().mul(rate));
      values.set(name, current);
    }
  }
  return [...values.values()].map((item) => ({ ...item, value: item.value.toNumber() })).sort((a, b) => b.value - a.value);
}
