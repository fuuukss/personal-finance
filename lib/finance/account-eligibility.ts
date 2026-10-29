import type { Account, EventType } from "@/lib/finance/types";

type EditableEventType = Extract<EventType, "expense" | "income" | "balance_adjustment">;

export function eligibleAccountsForNewEvent(accounts: Account[], eventType: "expense" | "income" | "transfer") {
  if (eventType === "transfer") return accounts.filter((account) => account.archived_at === null);
  return accounts.filter((account) => account.archived_at === null);
}

export function eligibleAccountsForEventEdit(accounts: Account[], eventType: EditableEventType, currency: string) {
  void eventType;
  return accounts.filter((account) => account.archived_at === null && account.currency === currency);
}
