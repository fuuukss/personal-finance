import type { Account } from "@/lib/finance/types";

export type AccountRemovalStrategy =
  | "delete"
  | "archive"
  | "blocked_transactions"
  | "blocked_transfers"
  | "blocked_valuations";

export function partitionAccounts(accounts: Account[]) {
  return {
    active: accounts.filter((account) => account.archived_at === null),
    archived: accounts.filter((account) => account.archived_at !== null),
  };
}
