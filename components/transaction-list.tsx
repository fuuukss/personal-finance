"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Search, Trash2, X } from "lucide-react";
import type { Account, LedgerEvent } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { eventIcons } from "@/components/ui/icons";
import { formatMoney } from "@/lib/finance/money";
import { deleteEventAction, updateEventAction, type ActionState } from "@/app/actions";
import Decimal from "decimal.js";
import { eligibleAccountsForEventEdit } from "@/lib/finance/account-eligibility";
import { displayAccountName } from "@/lib/i18n/account-names";
import { formatLocalDate } from "@/lib/i18n/format";
import { displayEntryForEvent } from "@/lib/finance/transaction-display";

interface Category { id: string; name: string; kind: string; color: string; }

export function TransactionList({ events, accounts, categories, language, dictionary: d, searchable = false, editable = true }: {
  events: LedgerEvent[]; accounts: Account[]; categories: Category[]; language: Language; dictionary: Dictionary; searchable?: boolean; editable?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LedgerEvent | null>(null);
  const [pending, startTransition] = useTransition();
  const [editState, editAction, editPending] = useActionState(updateEventAction, { ok: false, message: "" } satisfies ActionState);
  useEffect(() => {
    if (!editState.ok) return;
    const timer = setTimeout(() => setEditing(null), 350);
    return () => clearTimeout(timer);
  }, [editState.ok]);
  const filtered = useMemo(() => events.filter((event) => {
    const haystack = `${event.description ?? ""} ${event.entries.map((e) => `${e.account?.name ?? ""} ${e.category?.name ?? ""}`).join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [events, search]);
  return <>
    {searchable && <div className="field" style={{ marginBottom: "1rem" }}><label htmlFor="search">{d.search}</label><div style={{ position: "relative" }}><Search size={17} style={{ position: "absolute", left: ".85rem", top: "1rem", color: "#788493" }} /><input id="search" className="input" style={{ paddingLeft: "2.6rem" }} value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>}
    <div className="card transaction-list">
      {filtered.length === 0 ? <div className="empty">{d.noTransactions}</div> : filtered.map((event) => {
        const display = displayEntryForEvent(event);
        const entry = display?.entry;
        const Icon = eventIcons[event.event_type];
        const isExpense = event.event_type === "expense";
        const isIncome = event.event_type === "income";
        const fallbackTitle = event.event_type === "opening_balance" ? d.openingBalance : event.event_type === "balance_adjustment" ? d.balanceAdjustment : event.event_type.replaceAll("_", " ");
        const title = entry?.category?.name ?? (event.event_type === "opening_balance" ? fallbackTitle : event.description ?? fallbackTitle);
        const amount = formatMoney(display?.amount ?? 0, entry?.currency ?? "RSD", language);
        return <div className="transaction-row" key={event.id}>
          <div className="transaction-icon">{Icon ? <Icon size={18} /> : <span>•</span>}</div>
          <div><p className="transaction-title">{title}</p><p className="transaction-meta">{entry?.account?.name ? displayAccountName(entry.account.name, language) : ""} · {formatLocalDate(event.effective_date, language)}</p>{event.description && event.description !== title && <p className="transaction-description">{event.description}</p>}</div>
          <div style={{ display: "flex", alignItems: "center", gap: ".45rem" }}><span className={`amount ${isExpense ? "negative" : isIncome ? "positive" : ""}`}>{isExpense ? "−" : isIncome ? "+" : ""}{amount}</span>{editable && ["expense","income","balance_adjustment"].includes(event.event_type) && <button className="button secondary" aria-label={d.edit} onClick={() => setEditing(event)}><Pencil size={15} /></button>}{editable && event.event_type !== "opening_balance" && <button className="button secondary" disabled={pending} aria-label={d.delete} onClick={() => { if (confirm(d.confirmDelete)) startTransition(() => deleteEventAction(event.id)); }}><Trash2 size={15} /></button>}</div>
        </div>;
      })}
    </div>
    {editing && <EditTransactionSheet event={editing} accounts={accounts} categories={categories} dictionary={d} language={language} action={editAction} state={editState} pending={editPending} onClose={() => setEditing(null)} />}
  </>;
}

function EditTransactionSheet({ event, accounts, categories, dictionary: d, language, action, state, pending, onClose }: {
  event: LedgerEvent;
  accounts: Account[];
  categories: Category[];
  dictionary: Dictionary;
  language: Language;
  action: (payload: FormData) => void;
  state: ActionState;
  pending: boolean;
  onClose: () => void;
}) {
  const entry = event.entries[0];
  if (!entry) return null;
  const eventType = event.event_type as "expense" | "income" | "balance_adjustment";
  const eligibleAccounts = eligibleAccountsForEventEdit(accounts, eventType, entry.currency);
  const currentAccountMissing = !eligibleAccounts.some((account) => account.id === entry.account_id);
  const eligibleCategories = categories.filter((category) => category.kind === event.event_type);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title">
    <div className="page-header"><h2 id="edit-transaction-title">{d.edit}</h2><button type="button" className="button secondary" onClick={onClose} aria-label={d.cancel}><X size={17} /></button></div>
    <form action={action}>
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="expectedUpdatedAt" value={event.updated_at} />
      {eventType === "balance_adjustment" && <input type="hidden" name="categoryId" value="" />}
      <div className="form-grid">
        <div className="field"><label>{d.amount}</label><input className="input" name="amount" inputMode="decimal" defaultValue={eventType === "balance_adjustment" ? new Decimal(entry.amount).toFixed() : new Decimal(entry.amount).abs().toFixed()} required /></div>
        <div className="field"><label>{d.account}</label><select className="input" name="accountId" defaultValue={entry.account_id} required>
          {currentAccountMissing && <option value={entry.account_id}>{entry.account?.name ? displayAccountName(entry.account.name, language) : d.account} · {entry.currency}</option>}
          {eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{displayAccountName(account.name, language)} · {account.currency}</option>)}
        </select></div>
        {eventType !== "balance_adjustment" && <div className="field"><label>{d.category}</label><select className="input" name="categoryId" defaultValue={entry.category_id ?? ""} required>{eligibleCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}
        <div className="field"><label>{d.date}</label><input className="input" name="effectiveDate" type="date" defaultValue={event.effective_date} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>{d.description}</label><input className="input" name="description" defaultValue={event.description ?? ""} maxLength={500} /></div>
      </div>
      <p aria-live="polite" className={state.ok ? "positive" : "form-error"}>{state.message}</p><div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : d.save}</button></div>
    </form>
  </section></div>;
}
