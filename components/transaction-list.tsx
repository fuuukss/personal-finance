"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Pencil, Search, Trash2, X } from "lucide-react";
import type { LedgerEvent } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { eventIcons } from "@/components/ui/icons";
import { formatMoney } from "@/lib/finance/money";
import { deleteEventAction, updateEventAction, type ActionState } from "@/app/actions";
import Decimal from "decimal.js";

export function TransactionList({ events, language, dictionary: d, searchable = false }: { events: LedgerEvent[]; language: Language; dictionary: Dictionary; searchable?: boolean }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LedgerEvent | null>(null);
  const [pending, startTransition] = useTransition();
  const [editState, editAction, editPending] = useActionState(updateEventAction, { ok: false, message: "" } satisfies ActionState);
  const filtered = useMemo(() => events.filter((event) => {
    const haystack = `${event.description ?? ""} ${event.entries.map((e) => `${e.account?.name ?? ""} ${e.category?.name ?? ""}`).join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [events, search]);
  const locale = language === "sr-Latn" ? "sr-Latn-RS" : "en-US";
  return <>
    {searchable && <div className="field" style={{ marginBottom: "1rem" }}><label htmlFor="search">{d.search}</label><div style={{ position: "relative" }}><Search size={17} style={{ position: "absolute", left: ".85rem", top: "1rem", color: "#788493" }} /><input id="search" className="input" style={{ paddingLeft: "2.6rem" }} value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>}
    <div className="card transaction-list">
      {filtered.length === 0 ? <div className="empty">{d.noTransactions}</div> : filtered.map((event) => {
        const entry = event.entries[0];
        const Icon = eventIcons[event.event_type];
        const isExpense = event.event_type === "expense";
        const isIncome = event.event_type === "income";
        const title = entry?.category?.name ?? event.description ?? event.event_type.replaceAll("_", " ");
        const amount = event.transfer ? `${formatMoney(event.transfer.source_amount, entry?.currency ?? "RSD", language)}` : formatMoney(new Decimal(entry?.amount ?? 0).abs(), entry?.currency ?? "RSD", language);
        return <div className="transaction-row" key={event.id}>
          <div className="transaction-icon">{Icon ? <Icon size={18} /> : <span>•</span>}</div>
          <div><p className="transaction-title">{title}</p><p className="transaction-meta">{entry?.account?.name ?? ""} · {new Intl.DateTimeFormat(locale).format(new Date(`${event.effective_date}T12:00:00`))}</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: ".45rem" }}><span className={`amount ${isExpense ? "negative" : isIncome ? "positive" : ""}`}>{isExpense ? "−" : isIncome ? "+" : ""}{amount}</span>{["expense","income","balance_adjustment"].includes(event.event_type) && <button className="button secondary" aria-label={d.edit} onClick={() => setEditing(event)}><Pencil size={15} /></button>}{event.event_type !== "opening_balance" && <button className="button secondary" disabled={pending} aria-label={d.delete} onClick={() => { if (confirm(d.confirmDelete)) startTransition(() => deleteEventAction(event.id)); }}><Trash2 size={15} /></button>}</div>
        </div>;
      })}
    </div>
    {editing && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}><section className="sheet" role="dialog" aria-modal="true"><div className="page-header"><h2>{d.edit}</h2><button className="button secondary" onClick={() => setEditing(null)}><X size={17} /></button></div><form action={editAction}>
      <input type="hidden" name="id" value={editing.id} /><input type="hidden" name="categoryId" value={editing.entries[0]?.category_id ?? ""} />
      <div className="form-grid"><div className="field"><label>{d.amount}</label><input className="input" name="amount" inputMode="decimal" defaultValue={new Decimal(editing.entries[0]?.amount ?? 0).abs().toFixed()} required /></div><div className="field"><label>{d.date}</label><input className="input" name="effectiveDate" type="date" defaultValue={editing.effective_date} required /></div><div className="field" style={{ gridColumn: "1 / -1" }}><label>{d.description}</label><input className="input" name="description" defaultValue={editing.description ?? ""} maxLength={500} /></div></div>
      <p className={editState.ok ? "positive" : "form-error"}>{editState.message}</p><div className="form-actions"><button className="button" disabled={editPending}>{editPending ? "…" : d.save}</button></div>
    </form></section></div>}
  </>;
}
