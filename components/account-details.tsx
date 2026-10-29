"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Pencil, Scale, Trash2, TrendingUp } from "lucide-react";
import {
  reconcileAccountAction,
  removeEmptyAccountAction,
  renameAccountAction,
  saveValuationAction,
  type ActionState,
} from "@/app/actions";
import { TransactionList } from "@/components/transaction-list";
import { formatMoney } from "@/lib/finance/money";
import type { Account, LedgerEvent } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { displayAccountName } from "@/lib/i18n/account-names";
import { formatLocalDate } from "@/lib/i18n/format";

const initial: ActionState = { ok: false, message: "" };

export function AccountDetails({ account, accounts, events, categories, language, dictionary: d }: {
  account: Account;
  accounts: Account[];
  events: LedgerEvent[];
  categories: Array<{ id: string; name: string; kind: string; color: string }>;
  language: Language;
  dictionary: Dictionary;
}) {
  const [valuationState, valuationAction, valuationPending] = useActionState(saveValuationAction, initial);
  const [adjustmentState, adjustmentAction, adjustmentPending] = useActionState(reconcileAccountAction, initial);
  const [removeState, removeAction, removePending] = useActionState(removeEmptyAccountAction, initial);
  const [renameState, renameAction, renamePending] = useActionState(renameAccountAction, initial);
  const today = new Date().toISOString().slice(0, 10);
  const displayValue = account.kind === "investment" ? (account.latest_valuation ?? account.balance) : account.balance;

  return <>
    <div className="page-header compact-header">
      <div><Link className="back-link" href="/accounts"><ArrowLeft size={16} />{d.accounts}</Link><h1>{displayAccountName(account.name, language)}</h1></div>
      <span className="badge">{account.currency}</span>
    </div>
    <section className="card account-detail-summary">
      <p className="muted">{account.kind === "investment" ? d.currentValue : d.currentBalance}</p>
      <p className="account-detail-value amount">{formatMoney(displayValue, account.currency, language)}</p>
      {account.kind === "investment" && account.valuation_date && <p className="wealth-note">{d.valuationDate}: {formatLocalDate(account.valuation_date, language)}</p>}
    </section>

    {account.kind === "investment" && <section className="card account-action-card">
      <div className="account-action-heading"><TrendingUp size={18} /><h2>{d.updateValue}</h2></div>
      <form action={valuationAction}><input type="hidden" name="accountId" value={account.id} /><div className="form-grid compact-form-grid">
        <Field label={`${d.amount} (${account.currency})`}><input className="input" name="amount" inputMode="decimal" defaultValue={account.latest_valuation ?? ""} required /></Field>
        <Field label={d.date}><input className="input" name="valuationDate" type="date" defaultValue={today} required /></Field>
        <Field label={`${d.description} (${d.optional})`}><input className="input" name="note" maxLength={500} /></Field>
      </div><Footer state={valuationState} pending={valuationPending} label={d.save} /></form>
    </section>}

    <details className="card account-action-card"><summary><Pencil size={17} />{d.edit}</summary><form action={renameAction} className="details-form">
      <input type="hidden" name="id" value={account.id} /><Field label={d.name}><input className="input" name="name" defaultValue={account.name} required maxLength={80} /></Field><Footer state={renameState} pending={renamePending} label={d.save} />
    </form></details>

    <details className="card account-action-card"><summary><Scale size={17} />{d.balanceAdjustment}</summary><form action={adjustmentAction} className="details-form">
      <input type="hidden" name="accountId" value={account.id} /><div className="form-grid compact-form-grid"><Field label={`${d.targetBalance} (${account.currency})`}><input className="input" name="targetBalance" inputMode="decimal" defaultValue={account.balance} required /></Field><Field label={d.date}><input className="input" name="effectiveDate" type="date" defaultValue={today} required /></Field><Field label={`${d.description} (${d.optional})`}><input className="input" name="description" maxLength={500} /></Field></div><Footer state={adjustmentState} pending={adjustmentPending} label={d.save} />
    </form></details>

    <div className="section-row compact-section-row"><h2>{d.accountHistory}</h2></div>
    <TransactionList events={events} accounts={accounts} categories={categories} language={language} dictionary={d} />

    <details className="card account-action-card danger-zone"><summary><Trash2 size={17} />{d.removeAccount}</summary><form action={removeAction} className="details-form">
      <input type="hidden" name="id" value={account.id} /><p className="muted">{d.removeAccountHint}</p><p aria-live="polite" className="form-error">{removeState.message}</p><button className="button danger" disabled={removePending}>{removePending ? "…" : d.removeAccount}</button>
    </form></details>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
function Footer({ state, pending, label }: { state: ActionState; pending: boolean; label: string }) { return <><p aria-live="polite" className={state.ok ? "positive" : "form-error"}>{state.message}</p><div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : label}</button></div></>; }
