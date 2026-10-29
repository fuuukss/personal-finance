import { describe, expect, it } from "vitest";
import { partitionAccounts } from "@/lib/finance/account-management";
import type { Account } from "@/lib/finance/types";

const account = (id: string, name: string, archivedAt: string | null): Account => ({
  id,
  name,
  currency: "EUR",
  kind: "savings",
  sort_order: Number(id),
  archived_at: archivedAt,
  balance: id === "1" ? "120" : "321.45",
});

describe("account lifecycle presentation", () => {
  it("keeps two distinct EUR accounts and separates archived visibility", () => {
    const original = account("1", "EUR Savings", "2026-10-20T10:00:00Z");
    const replacement = account("2", "EUR", null);

    const result = partitionAccounts([original, replacement]);

    expect(result.active).toEqual([replacement]);
    expect(result.archived).toEqual([original]);
    expect(result.archived[0]?.balance).toBe("120");
  });

  it("does not mutate account names or merge equal currencies", () => {
    const accounts = [account("1", "Custom EUR", null), account("2", "EUR", null)];

    const result = partitionAccounts(accounts);

    expect(result.active.map((item) => item.name)).toEqual(["Custom EUR", "EUR"]);
    expect(accounts).toHaveLength(2);
  });
});
