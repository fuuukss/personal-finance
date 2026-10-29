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

export function buildCategoryReport(events: LedgerEvent[], rates: RateRow[], displayCurrency: string, year: number, month?: number) {
  const values = new Map<string, { name: string; color: string; value: Decimal }>();
  for (const event of events) {
    if (event.event_type !== "expense" || !event.effective_date.startsWith(String(year))) continue;
    if (month && event.effective_date.slice(5, 7) !== String(month).padStart(2, "0")) continue;
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

interface ValuationRow { account_id: string; amount: string; currency: string; valuation_date: string; }

export function buildInvestmentHistory(valuations: ValuationRow[], rates: RateRow[], displayCurrency: string, year: number) {
  const latestByAccount = new Map<string, ValuationRow>();
  const missing = new Set<string>();
  const sorted = [...valuations].sort((a, b) => a.valuation_date.localeCompare(b.valuation_date));
  let cursor = 0;
  const months = Array.from({ length: 12 }, (_, index) => {
    const end = `${year}-${String(index + 1).padStart(2, "0")}-31`;
    while (cursor < sorted.length && sorted[cursor]!.valuation_date <= end) {
      const valuation = sorted[cursor]!;
      latestByAccount.set(valuation.account_id, valuation);
      cursor += 1;
    }
    let total = new Decimal(0);
    for (const valuation of latestByAccount.values()) {
      const rate = rateAt(rates, valuation.currency, displayCurrency, valuation.valuation_date);
      if (!rate) { missing.add(`${valuation.currency}/${displayCurrency}`); continue; }
      total = total.plus(new Decimal(valuation.amount).mul(rate));
    }
    return { month: index + 1, value: total.toNumber() };
  });
  return { months, missing: [...missing] };
}

export function buildInvestmentResult(
  events: LedgerEvent[],
  valuations: ValuationRow[],
  rates: RateRow[],
  displayCurrency: string,
  periodStart: string,
  periodEndExclusive: string,
) {
  const accountIds = new Set(valuations.map((valuation) => valuation.account_id));
  const inPeriod = valuations.filter((valuation) => valuation.valuation_date >= periodStart && valuation.valuation_date < periodEndExclusive);
  if (inPeriod.length === 0) return null;

  const missing = new Set<string>();
  const valueAt = (endExclusive: string) => {
    const latest = new Map<string, ValuationRow>();
    for (const valuation of valuations) {
      if (valuation.valuation_date >= endExclusive) continue;
      const current = latest.get(valuation.account_id);
      if (!current || current.valuation_date < valuation.valuation_date) latest.set(valuation.account_id, valuation);
    }
    let total = new Decimal(0);
    for (const valuation of latest.values()) {
      const rate = rateAt(rates, valuation.currency, displayCurrency, valuation.valuation_date);
      if (!rate) { missing.add(`${valuation.currency}/${displayCurrency}`); continue; }
      total = total.plus(new Decimal(valuation.amount).mul(rate));
    }
    return total;
  };

  let contributions = new Decimal(0);
  let withdrawals = new Decimal(0);
  for (const event of events) {
    if (event.effective_date < periodStart || event.effective_date >= periodEndExclusive) continue;
    if (event.event_type !== "investment_contribution" && event.event_type !== "investment_withdrawal") continue;
    for (const entry of event.entries) {
      if (!accountIds.has(entry.account_id)) continue;
      const rate = rateAt(rates, entry.currency, displayCurrency, event.effective_date);
      if (!rate) { missing.add(`${entry.currency}/${displayCurrency}`); continue; }
      const value = new Decimal(entry.amount).abs().mul(rate);
      if (event.event_type === "investment_contribution") contributions = contributions.plus(value);
      else withdrawals = withdrawals.plus(value);
    }
  }

  const startingValue = valueAt(periodStart);
  const endingValue = valueAt(periodEndExclusive);
  return {
    endingValue: endingValue.toNumber(),
    result: endingValue.minus(startingValue).minus(contributions).plus(withdrawals).toNumber(),
    missing: [...missing],
  };
}
