"use client";

import { useActionState, useState } from "react";
import { Archive, ChevronDown, ChevronUp, Pencil, Plus, Scale, TrendingUp, X } from "lucide-react";
import { archiveAccountAction, createAccountAction, reconcileAccountAction, renameAccountAction, reorderAccountAction, saveValuationAction, type ActionState } from "@/app/actions";
import { AccountCard } from "@/components/account-card";
import type { Account } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";

const initial: ActionState = { ok: false, message: "" };

export function AccountsManager({ accounts, language, dictionary: d }: { accounts: Account[]; language: Language; dictionary: Dictionary }) {
  const [showAccount, setShowAccount] = useState(false);
  const [valuationAccount, setValuationAccount] = useState<Account | null>(null);
  const [adjustmentAccount, setAdjustmentAccount] = useState<Account | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [accountState, accountAction, accountPending] = useActionState(createAccountAction, initial);
  const [valuationState, valuationAction, valuationPending] = useActionState(saveValuationAction, initial);
  const [adjustmentState, adjustmentAction, adjustmentPending] = useActionState(reconcileAccountAction, initial);
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <div className="page-header"><div><p className="eyebrow">Saldo</p><h1>{d.accounts}</h1></div><button className="button" onClick={() => setShowAccount(true)}><Plus size={17} />{d.addAccount}</button></div>
    <section className="grid accounts-grid">{accounts.map((account) => <div key={account.id} style={{ position: "relative" }}><AccountCard account={account} language={language} /><div style={{ display: "flex", gap: ".35rem", position: "absolute", right: ".65rem", bottom: ".55rem" }}><form action={reorderAccountAction.bind(null, account.id, -1)}><button className="button secondary" aria-label="Move up"><ChevronUp size={14} /></button></form><form action={reorderAccountAction.bind(null, account.id, 1)}><button className="button secondary" aria-label="Move down"><ChevronDown size={14} /></button></form><button className="button secondary" aria-label={d.edit} onClick={() => setEditAccount(account)}><Pencil size={14} /></button><button className="button secondary" aria-label={d.balanceAdjustment} onClick={() => setAdjustmentAccount(account)}><Scale size={14} /></button>{account.kind === "investment" && <button className="button secondary" aria-label={d.currentValue} onClick={() => setValuationAccount(account)}><TrendingUp size={14} /></button>}<form action={archiveAccountAction.bind(null, account.id)}><button className="button secondary" aria-label={d.archived}><Archive size={14} /></button></form></div></div>)}</section>
    {accounts.length === 0 && <div className="card empty">{d.noAccounts}</div>}
    {showAccount && <Modal title={d.addAccount} close={() => setShowAccount(false)}><form action={accountAction}>
      <div className="form-grid"><Field label="Name"><input className="input" name="name" required maxLength={80} /></Field><Field label="Currency"><select className="input" name="currency"><option>RSD</option><option>EUR</option><option>USD</option></select></Field><Field label="Type"><select className="input" name="kind"><option value="cash">Cash</option><option value="bank">Bank</option><option value="savings">Savings</option><option value="investment">Investment</option></select></Field><Field label="Opening balance"><input className="input" name="openingBalance" inputMode="decimal" defaultValue="0" required /></Field><Field label="Start date"><input className="input" name="startDate" type="date" defaultValue={today} required /></Field></div>
      <Footer state={accountState} pending={accountPending} label={d.save} />
    </form></Modal>}
    {valuationAccount && <Modal title={`${valuationAccount.name} · ${d.currentValue}`} close={() => setValuationAccount(null)}><form action={valuationAction}>
      <input type="hidden" name="accountId" value={valuationAccount.id} /><div className="form-grid"><Field label={`${d.amount} (${valuationAccount.currency})`}><input className="input" name="amount" inputMode="decimal" required autoFocus /></Field><Field label={d.date}><input className="input" name="valuationDate" type="date" defaultValue={today} required /></Field><div style={{ gridColumn: "1 / -1" }}><Field label={`${d.description} (${d.optional})`}><input className="input" name="note" maxLength={500} /></Field></div></div><Footer state={valuationState} pending={valuationPending} label={d.save} />
    </form></Modal>}
    {adjustmentAccount && <Modal title={`${adjustmentAccount.name} · ${d.balanceAdjustment}`} close={() => setAdjustmentAccount(null)}><form action={adjustmentAction}>
      <input type="hidden" name="accountId" value={adjustmentAccount.id} /><div className="form-grid"><Field label={`Target balance (${adjustmentAccount.currency})`}><input className="input" name="targetBalance" inputMode="decimal" required autoFocus /></Field><Field label={d.date}><input className="input" name="effectiveDate" type="date" defaultValue={today} required /></Field><div style={{ gridColumn: "1 / -1" }}><Field label={`${d.description} (${d.optional})`}><input className="input" name="description" maxLength={500} /></Field></div></div><Footer state={adjustmentState} pending={adjustmentPending} label={d.save} />
    </form></Modal>}
    {editAccount && <Modal title={`${d.edit} · ${editAccount.name}`} close={() => setEditAccount(null)}><form action={renameAccountAction}>
      <input type="hidden" name="id" value={editAccount.id} /><Field label="Name"><input className="input" name="name" defaultValue={editAccount.name} required maxLength={80} /></Field><div className="form-actions"><button className="button">{d.save}</button></div>
    </form></Modal>}
  </>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="sheet" role="dialog" aria-modal="true"><div className="page-header"><h2>{title}</h2><button className="button secondary" onClick={close}><X size={17} /></button></div>{children}</section></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
function Footer({ state, pending, label }: { state: ActionState; pending: boolean; label: string }) { return <><p className={state.ok ? "positive" : "form-error"} style={{ minHeight: "1.3rem", marginTop: ".7rem" }}>{state.message}</p><div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : label}</button></div></>; }
