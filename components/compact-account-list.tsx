import Link from "next/link";
import type { Account } from "@/lib/finance/types";
import type { Language } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/finance/money";
import { accountIcons } from "@/components/ui/icons";
import { displayAccountName } from "@/lib/i18n/account-names";

export function CompactAccountList({ accounts, language }: { accounts: Account[]; language: Language }) {
  return <section className="card compact-account-list">
    {accounts.map((account) => {
      const Icon = accountIcons[account.kind];
      const value = account.kind === "investment" ? (account.latest_valuation ?? account.balance) : account.balance;
      return <Link className="compact-account-row" href={`/accounts/${account.id}`} key={account.id}>
        <span className="compact-account-icon"><Icon size={17} /></span>
        <span className="compact-account-name">{displayAccountName(account.name, language)}</span>
        <span className="compact-account-balance amount">{formatMoney(value, account.currency, language)}</span>
      </Link>;
    })}
  </section>;
}
