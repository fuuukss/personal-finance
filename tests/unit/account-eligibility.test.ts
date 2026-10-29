import { describe, expect, it } from "vitest";
import { eligibleAccountsForEventEdit, eligibleAccountsForNewEvent } from "@/lib/finance/account-eligibility";
import type { Account } from "@/lib/finance/types";

const accounts: Account[] = [
  { id: "cash", name: "RSD Cash", currency: "RSD", kind: "cash", sort_order: 0, archived_at: null, balance: "1000" },
  { id: "eur", name: "EUR Savings", currency: "EUR", kind: "savings", sort_order: 1, archived_at: null, balance: "100" },
  { id: "usd", name: "USD Savings", currency: "USD", kind: "savings", sort_order: 2, archived_at: null, balance: "100" },
  { id: "ibkr", name: "IBKR", currency: "EUR", kind: "investment", sort_order: 3, archived_at: null, balance: "0" },
  { id: "old", name: "Old account", currency: "EUR", kind: "savings", sort_order: 4, archived_at: "2026-01-01T00:00:00Z", balance: "0" },
];

describe("transaction account eligibility", () => {
  it("keeps active EUR and USD savings accounts available for new transactions", () => {
    const ids = eligibleAccountsForNewEvent(accounts, "expense").map((account) => account.id);
    expect(ids).toContain("eur");
    expect(ids).toContain("usd");
    expect(ids).not.toContain("old");
  });

  it("keeps savings accounts available as transfer endpoints", () => {
    const ids = eligibleAccountsForNewEvent(accounts, "transfer").map((account) => account.id);
    expect(ids).toEqual(["cash", "eur", "usd", "ibkr"]);
  });

  it("only offers currency-compatible active accounts while editing", () => {
    expect(eligibleAccountsForEventEdit(accounts, "expense", "EUR").map((account) => account.id)).toEqual(["eur", "ibkr"]);
  });
});
