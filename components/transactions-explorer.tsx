"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { TransactionList } from "@/components/transaction-list";
import type { Account, LedgerEvent } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";

export type TransactionKindFilter = "expense" | "income" | "all";

interface Category { id: string; name: string; kind: string; color: string; }

export function TransactionsExplorer({
  events,
  accounts,
  categories,
  language,
  dictionary: d,
  initialKind,
  showAll,
  year,
  month,
  totals,
  missingRates,
}: {
  events: LedgerEvent[];
  accounts: Account[];
  categories: Category[];
  language: Language;
  dictionary: Dictionary;
  initialKind: TransactionKindFilter;
  showAll: boolean;
  year: number;
  month: number;
  totals: { expense: string; income: string };
  missingRates: Record<TransactionKindFilter, string[]>;
}) {
  const [kind, setKind] = useState(initialKind);
  const visibleEvents = useMemo(
    () => kind === "all" ? events : events.filter((event) => event.event_type === kind),
    [events, kind],
  );
  const periodHref = (targetKind: TransactionKindFilter) => `/transactions?kind=${targetKind}&year=${year}&month=${month}`;
  const currentMissingRates = missingRates[showAll ? "all" : kind];

  function selectKind(event: MouseEvent<HTMLAnchorElement>, targetKind: TransactionKindFilter) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setKind(targetKind);
    window.history.replaceState(null, "", periodHref(targetKind));
  }

  return <>
    <nav className="filter-tabs" aria-label={d.transactionType}>
      {(["all", "expense", "income"] as const).map((targetKind) => {
        const label = targetKind === "all" ? d.allTypes : targetKind === "expense" ? d.expenses : d.income;
        const href = periodHref(targetKind);
        return showAll
          ? <Link key={targetKind} href={href}>{label}</Link>
          : <a key={targetKind} className={kind === targetKind ? "active" : ""} href={href} onClick={(event) => selectKind(event, targetKind)} aria-current={kind === targetKind ? "page" : undefined}>{label}</a>;
      })}
      <Link className={showAll ? "active" : ""} href="/transactions?all=1" prefetch={false}>{d.completeHistory}</Link>
    </nav>
    {!showAll && kind !== "all" && <section className="card period-total"><span>{d.total}</span><strong className="amount">{totals[kind]}</strong></section>}
    {currentMissingRates.length > 0 && <div className="card compact-warning">{d.incompleteMonthlySummary} {d.missingRates}: {currentMissingRates.join(", ")}.</div>}
    <TransactionList key={showAll ? "history" : kind} events={visibleEvents} accounts={accounts} categories={categories} language={language} dictionary={d} searchable />
  </>;
}
