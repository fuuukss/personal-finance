import { describe, expect, it } from "vitest";
import { formatLocalDate } from "@/lib/i18n/format";
import { displayEntryForEvent } from "@/lib/finance/transaction-display";
import type { LedgerEvent } from "@/lib/finance/types";

const transfer: LedgerEvent = {
  id: "event", event_type: "transfer", effective_date: "2026-10-28", updated_at: "2026-10-28T12:00:00Z", description: null,
  transfer: { source_account_id: "eur", destination_account_id: "rsd", source_amount: "100", destination_amount: "11700", effective_rate: "117" },
  entries: [{ id: "destination", amount: "11700", currency: "RSD", account_id: "rsd", category_id: null }],
};

describe("localized transaction display", () => {
  it("uses the destination amount in an account-filtered transfer history", () => {
    expect(displayEntryForEvent(transfer)?.amount).toBe("11700");
  });

  it("uses the source amount for the source account", () => {
    const source = { ...transfer, entries: [{ ...transfer.entries[0]!, id: "source", account_id: "eur", currency: "EUR" as const, amount: "-100" }] };
    expect(displayEntryForEvent(source)?.amount).toBe("100");
  });

  it("formats the default Serbian date with trailing period", () => {
    expect(formatLocalDate("2026-10-28", "sr-Latn")).toBe("28.10.2026.");
    expect(formatLocalDate("2026-10-28", "en")).toBe("10/28/2026");
  });
});
