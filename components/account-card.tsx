import Link from "next/link";
import type { Account } from "@/lib/finance/types";
import { formatMoney } from "@/lib/finance/money";
import { accountIcons } from "@/components/ui/icons";

export function AccountCard({ account, language }: { account: Account; language: "sr-Latn" | "en" }) {
  const Icon = accountIcons[account.kind];
  const value = account.kind === "investment" ? (account.latest_valuation ?? account.balance) : account.balance;
  return <Link href={`/accounts?account=${account.id}`} className="card account-card">
    <div className="account-top"><div className="icon-box"><Icon size={20} /></div><span className="badge">{account.currency}</span></div>
    <div><p className="account-name">{account.name}</p><p className="account-balance amount">{formatMoney(value, account.currency, language)}</p></div>
  </Link>;
}
