"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { createEventAction, createTransferAction, type ActionState } from "@/app/actions";
import type { Account } from "@/lib/finance/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { eligibleAccountsForNewEvent } from "@/lib/finance/account-eligibility";

const initial: ActionState = { ok: false, message: "" };

export function TransactionSheet({ accounts, categories, dictionary: d, onClose }: {
  accounts: Account[]; categories: Array<{ id: string; name: string; kind: string; color: string }>; dictionary: Dictionary; onClose: () => void;
}) {
  const [kind, setKind] = useState<"expense" | "income" | "transfer">("expense");
  const [eventState, eventAction, eventPending] = useActionState(createEventAction, initial);
  const [transferState, transferAction, transferPending] = useActionState(createTransferAction, initial);
  const state = kind === "transfer" ? transferState : eventState;
  const pending = eventPending || transferPending;
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => { if (state.ok) { const timer = setTimeout(onClose, 350); return () => clearTimeout(timer); } }, [state.ok, onClose]);
  const filteredCategories = categories.filter((category) => category.kind === kind);
  const eligibleAccounts = eligibleAccountsForNewEvent(accounts, kind);
  const today = new Date().toISOString().slice(0, 10);

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
      <div className="page-header"><div><p className="eyebrow">Saldo</p><h2 id="transaction-title">{d.addTransaction}</h2></div><button className="button secondary" onClick={onClose} aria-label={d.cancel}><X size={18} /></button></div>
      <div className="segmented" role="tablist">
        <button type="button" className={kind === "expense" ? "active" : ""} onClick={() => setKind("expense")}>{d.expense}</button>
        <button type="button" className={kind === "income" ? "active" : ""} onClick={() => setKind("income")}>{d.incomeType}</button>
        <button type="button" className={kind === "transfer" ? "active" : ""} onClick={() => setKind("transfer")}>{d.transfer}</button>
      </div>
      {kind === "transfer" ? <form action={transferAction} style={{ marginTop: "1rem" }}>
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <TransferFields accounts={eligibleAccounts} dictionary={d} today={today} /><FormFooter state={state} pending={pending} label={d.save} />
      </form> : <form action={eventAction} style={{ marginTop: "1rem" }}>
        <input type="hidden" name="eventType" value={kind} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <div className="form-grid">
          <Field label={d.amount}><input className="input" name="amount" type="text" inputMode="decimal" autoFocus autoComplete="off" placeholder="0,00" required /></Field>
          <Field label={d.category}><select className="input" name="categoryId" required>{filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label={d.account}><select className="input" name="accountId" required>{eligibleAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>
          <Field label={d.date}><input className="input" name="effectiveDate" type="date" defaultValue={today} required /></Field>
          <div style={{ gridColumn: "1 / -1" }}><Field label={`${d.description} (${d.optional})`}><input className="input" name="description" maxLength={500} /></Field></div>
        </div><FormFooter state={state} pending={pending} label={d.save} />
      </form>}
    </section>
  </div>;
}

function TransferFields({ accounts, dictionary: d, today }: { accounts: Account[]; dictionary: Dictionary; today: string }) {
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [sourceAmount, setSourceAmount] = useState("");
  const [destinationAmount, setDestinationAmount] = useState("");
  const [hint, setHint] = useState("");
  const source = accounts.find((account) => account.id === sourceId);
  const destination = accounts.find((account) => account.id === destinationId);
  useEffect(() => {
    const numeric = Number(sourceAmount.replace(",", "."));
    if (!source || !destination || source.currency === destination.currency || !Number.isFinite(numeric) || numeric <= 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/exchange-rate?base=${source.currency}&quote=${destination.currency}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as { rate?: string; date?: string; error?: string };
        if (!response.ok || !data.rate) { setHint(data.error ?? "Rate unavailable"); return; }
        const suggestion = (numeric * Number(data.rate)).toFixed(2);
        setDestinationAmount(suggestion);
        setHint(`Indicative ${data.date}: 1 ${source.currency} = ${data.rate} ${destination.currency}. Replace with the actual amount received.`);
      } catch { if (!controller.signal.aborted) setHint("Rate unavailable. Enter the actual amount manually."); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [source, destination, sourceAmount]);
  return <div className="form-grid">
    <Field label="Source account"><select className="input" name="sourceAccountId" required value={sourceId} onChange={(e) => { setHint(""); setSourceId(e.target.value); }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>
    <Field label="Destination account"><select className="input" name="destinationAccountId" required value={destinationId} onChange={(e) => { setHint(""); setDestinationId(e.target.value); }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field>
    <Field label="Source amount"><input className="input" name="sourceAmount" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" required value={sourceAmount} onChange={(e) => { setHint(""); setSourceAmount(e.target.value); }} /></Field>
    <Field label="Actual amount received"><input className="input" name="destinationAmount" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" required value={destinationAmount} onChange={(e) => setDestinationAmount(e.target.value)} /></Field>
    {hint && <p className="muted" style={{ gridColumn: "1 / -1", fontSize: ".78rem", margin: 0 }}>{hint}</p>}
    <Field label={d.date}><input className="input" name="effectiveDate" type="date" defaultValue={today} required /></Field>
    <Field label={`${d.description} (${d.optional})`}><input className="input" name="description" maxLength={500} /></Field>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
function FormFooter({ state, pending, label }: { state: ActionState; pending: boolean; label: string }) {
  return <><div aria-live="polite" className={state.ok ? "positive" : "form-error"} style={{ minHeight: "1.4rem", marginTop: ".8rem" }}>{state.message}</div><div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : label}</button></div></>;
}
