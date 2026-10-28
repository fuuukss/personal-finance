"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginAction, type ActionState } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initial: ActionState = { ok: false, message: "" };

export function LoginForm({ dictionary: d, notice }: { dictionary: Dictionary; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return <form action={action} className="card login-card">
    <div className="icon-box" style={{ marginBottom: "1rem" }}><LockKeyhole size={22} /></div>
    <p className="eyebrow">{d.appName}</p><h1>{d.login}</h1><p className="muted">{d.ownerOnly}</p>
    {notice ? <p role="status" style={{ color: "var(--positive, #166534)", marginTop: ".75rem" }}>{notice}</p> : null}
    <div className="grid">
      <div className="field"><label htmlFor="email">{d.email}</label><input className="input" id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="field"><label htmlFor="password">{d.password}</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
    </div>
    <p className="form-error" aria-live="polite" style={{ minHeight: "1.3rem", marginTop: ".75rem" }}>{state.message}</p>
    <button className="button" style={{ width: "100%" }} disabled={pending}>{pending ? "…" : d.signIn}</button>
  </form>;
}
