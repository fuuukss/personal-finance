"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { updateRecoveryPasswordAction, type RecoveryActionState } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: RecoveryActionState = { ok: false, message: "" };

export function RecoveryPasswordForm({ dictionary: d }: { dictionary: Dictionary }) {
  const [state, action, pending] = useActionState(updateRecoveryPasswordAction, initialState);

  return <form action={action} className="card login-card">
    <div className="icon-box" style={{ marginBottom: "1rem" }}><LockKeyhole size={22} /></div>
    <p className="eyebrow">{d.appName}</p>
    <h1>{d.setNewCredential}</h1>
    <p className="muted">{d.credentialRequirements}</p>
    <div className="grid" style={{ marginTop: "1rem" }}>
      <div className="field">
        <label htmlFor="password">{d.newCredential}</label>
        <input className="input" id="password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="passwordConfirmation">{d.confirmCredential}</label>
        <input className="input" id="passwordConfirmation" name="passwordConfirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
      </div>
    </div>
    <p className="form-error" aria-live="polite" style={{ minHeight: "1.3rem", marginTop: ".75rem" }}>{state.message}</p>
    <button className="button" style={{ width: "100%" }} disabled={pending}>{pending ? "…" : d.updateCredential}</button>
  </form>;
}
