import Decimal from "decimal.js";
import type { LedgerEvent } from "@/lib/finance/types";

export function displayEntryForEvent(event: LedgerEvent) {
  const entry = event.entries[0];
  if (!entry) return null;
  if (!event.transfer) return { entry, amount: new Decimal(entry.amount).abs().toFixed() };

  const isDestination = entry.account_id === event.transfer.destination_account_id;
  return {
    entry,
    amount: isDestination ? event.transfer.destination_amount : event.transfer.source_amount,
  };
}
