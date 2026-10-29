import Decimal from "decimal.js";
import type { Account, LedgerEvent } from "@/lib/finance/types";

export function accountDisplayValue(account: Account, rate: Decimal.Value) {
  const native = account.kind === "investment" ? (account.latest_valuation ?? account.balance) : account.balance;
  return new Decimal(native).mul(rate);
}

export function isCurrentNetWorthAccount(account: Account) {
  return account.archived_at === null;
}

export function isSpendingAccount(account: Account) {
  return account.archived_at === null && account.currency === "RSD" && (account.kind === "cash" || account.kind === "bank");
}

export function spendingMoneyTotal(accounts: Account[]) {
  return accounts.reduce((total, account) => isSpendingAccount(account) ? total.plus(account.balance) : total, new Decimal(0));
}

export function monthlyCashFlow(events: LedgerEvent[], month: string) {
  let expenses = new Decimal(0);
  let income = new Decimal(0);
  for (const event of events) {
    if (!event.effective_date.startsWith(month)) continue;
    if (event.event_type === "expense") expenses = expenses.plus(new Decimal(event.entries[0]?.amount ?? 0).abs());
    if (event.event_type === "income") income = income.plus(event.entries[0]?.amount ?? 0);
  }
  return { expenses, income, difference: income.minus(expenses) };
}

export function spendingByCategory(events: LedgerEvent[], month: string) {
  const totals = new Map<string, { name: string; color: string; value: Decimal }>();
  for (const event of events) {
    if (event.event_type !== "expense" || !event.effective_date.startsWith(month)) continue;
    const entry = event.entries[0];
    const name = entry?.category?.name ?? "Other";
    const current = totals.get(name) ?? { name, color: entry?.category?.color ?? "#64748b", value: new Decimal(0) };
    current.value = current.value.plus(new Decimal(entry?.amount ?? 0).abs());
    totals.set(name, current);
  }
  return [...totals.values()].map((item) => ({ ...item, value: item.value.toNumber() })).sort((a, b) => b.value - a.value);
}
