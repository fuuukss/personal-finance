"use client";

import { useActionState, useMemo, useState } from "react";
import { completeOnboardingAction, type ActionState } from "@/app/actions";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { MoneyInput } from "@/components/money-input";

const defaults = [
  { name: "RSD Cash", currency: "RSD", kind: "cash", balance: "0" },
  { name: "RSD Card", currency: "RSD", kind: "bank", balance: "0" },
  { name: "EUR Savings", currency: "EUR", kind: "savings", balance: "0" },
  { name: "USD Savings", currency: "USD", kind: "savings", balance: "0" },
  { name: "IBKR", currency: "EUR", kind: "investment", balance: "0" }
];

export function OnboardingForm({ dictionary: d, language }: { dictionary: Dictionary; language: Language }) {
  const [accounts, setAccounts] = useState(defaults);
  const [state, action, pending] = useActionState(completeOnboardingAction, { ok: false, message: "" } satisfies ActionState);
  const serialized = useMemo(() => JSON.stringify(accounts.map((a) => ({ ...a, balance: a.balance.replace(",", ".") }))), [accounts]);
  return <form action={action} className="card panel">
    <p className="muted">{d.onboardingIntro}</p><div className="field" style={{ marginBottom: "1rem" }}><label>{d.date}</label><input className="input" name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
    <input type="hidden" name="accounts" value={serialized} />
    <div className="grid">{accounts.map((account, index) => <div className="form-grid" key={`${account.kind}-${index}`} style={{ padding: "1rem", background: "#0f1318", borderRadius: ".9rem" }}><Field label={d.name}><input className="input" value={account.name} onChange={(e) => setAccounts((all) => all.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} /></Field><Field label={d.currency}><select className="input" value={account.currency} onChange={(e) => setAccounts((all) => all.map((item, i) => i === index ? { ...item, currency: e.target.value } : item))}><option>RSD</option><option>EUR</option><option>USD</option></select></Field><Field label={d.openingBalance}><MoneyInput name={`openingBalance-${index}`} language={language} allowNegative value={account.balance} onValueChange={(value) => setAccounts((all) => all.map((item, i) => i === index ? { ...item, balance: value } : item))} /></Field></div>)}</div>
    <p aria-live="polite" className={state.ok ? "positive" : "form-error"}>{state.message}</p><div className="form-actions"><button className="button" disabled={pending}>{pending ? d.loading : d.finish}</button></div>
  </form>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
