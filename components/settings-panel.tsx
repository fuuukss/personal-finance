"use client";

import { useTransition } from "react";
import { Download, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction, updatePreferencesAction } from "@/app/actions";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";

export function SettingsPanel({ language, currency, dictionary: d }: { language: Language; currency: string; dictionary: Dictionary }) {
  const [pending, startTransition] = useTransition();
  return <div className="grid">
    <form className="card panel" action={(formData) => startTransition(() => updatePreferencesAction(formData))}>
      <div className="setting-row"><div><strong>{d.language}</strong><p className="muted" style={{ margin: ".25rem 0 0" }}>Srpski / English</p></div><select className="input" name="language" defaultValue={language} style={{ width: "auto" }}><option value="sr-Latn">Srpski</option><option value="en">English</option></select></div>
      <div className="setting-row"><div><strong>{d.displayCurrency}</strong><p className="muted" style={{ margin: ".25rem 0 0" }}>RSD · EUR · USD</p></div><select className="input" name="displayCurrency" defaultValue={currency} style={{ width: "auto" }}><option>RSD</option><option>EUR</option><option>USD</option></select></div>
      <div className="form-actions"><button className="button" disabled={pending}>{pending ? "…" : d.save}</button></div>
    </form>
    <div className="card panel"><div className="setting-row"><div style={{ display: "flex", gap: ".8rem", alignItems: "center" }}><ShieldCheck className="positive" /><div><strong>{d.security}</strong><p className="muted" style={{ margin: ".25rem 0 0" }}>Owner-only access · database RLS</p></div></div></div><div className="setting-row"><div style={{ display: "flex", gap: ".8rem", alignItems: "center" }}><Download /><div><strong>{d.dataExport}</strong><p className="muted" style={{ margin: ".25rem 0 0" }}>Use Supabase encrypted backup procedure</p></div></div></div></div>
    <form action={logoutAction}><button className="button danger" style={{ width: "100%" }}><LogOut size={17} />{d.logout}</button></form>
  </div>;
}
