"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createAccountAction, type ActionState } from "@/app/actions";
import { CompactAccountList } from "@/components/compact-account-list";
import type { Account } from "@/lib/finance/types";
import { partitionAccounts } from "@/lib/finance/account-management";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";

const initial: ActionState = { ok: false, message: "" };

export function AccountsManager({ accounts, language, dictionary: d, notice = "" }: { accounts: Account[]; language: Language; dictionary: Dictionary; notice?: string }) {
  const [showAccount, setShowAccount] = useState(false);
  const [accountState, accountAction, accountPending] = useActionState(createAccountAction, initial);
  const today = new Date().toISOString().slice(0, 10);
  const { active, archived } = partitionAccounts(accounts);
  return <>
    <div className="page-header compact-header"><div><p className="eyebrow">Saldo</p><h1>{d.accounts}</h1></div><button className="button" onClick={() => setShowAccount(true)}><Plus size={17} />{d.addAccount}</button></div>
    {notice && <div className="card success-banner" role="status">{notice}</div>}
    <CompactAccountList accounts={active} language={language} />
    {active.length === 0 && <div className="card empty">{d.noAccounts}</div>}
    {archived.length > 0 && <details className="card account-action-card archived-accounts">
      <summary>{d.archivedAccounts} <span className="badge">{archived.length}</span></summary>
      <div className="details-form"><p className="muted">{d.archivedAccountsHint}</p><CompactAccountList accounts={archived} language={language} /></div>
    </details>}
    {showAccount && <Modal title={d.addAccount} closeLabel={d.cancel} close={() => setShowAccount(false)}><form action={accountAction}>
      <div className="form-grid">
        <Field label={d.name}><input className="input" name="name" required maxLength={80} /></Field>
        <Field label={d.currency}><select className="input" name="currency"><option>RSD</option><option>EUR</option><option>USD</option></select></Field>
        <Field label={d.accountType}><select className="input" name="kind"><option value="cash">{d.cash}</option><option value="bank">{d.bank}</option><option value="savings">{d.savings}</option><option value="investment">{d.investment}</option></select></Field>
        <Field label={d.openingBalance}><input className="input" name="openingBalance" inputMode="decimal" defaultValue="0" required /></Field>
        <Field label={d.startDate}><input className="input" name="startDate" type="date" defaultValue={today} required /></Field>
      </div>
      <Footer state={accountState} pending={accountPending} label={d.save} />
    </form></Modal>}
  </>;
}

function Modal({ title, closeLabel, close, children }: { title: string; closeLabel: string; close: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><div className="page-header"><h2 id="account-modal-title">{title}</h2><button type="button" className="button secondary" onClick={close} aria-label={closeLabel}><X size={17} /></button></div>{children}</section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
function Footer({ state, pending, label }: { state: ActionState; pending: boolean; label: string }) { return <><p aria-live="polite" className={state.ok ? "positive" : "form-error"} style={{ minHeight: "1.3rem", marginTop: ".7rem" }}>{state.message}</p><div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : label}</button></div></>; }
