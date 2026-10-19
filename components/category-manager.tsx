"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { saveCategoryAction, type ActionState } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initial: ActionState = { ok: false, message: "" };

export function CategoryManager({ categories, dictionary: d }: { categories: Array<{ id: string; name: string; kind: string; color: string }>; dictionary: Dictionary }) {
  const [state, action, pending] = useActionState(saveCategoryAction, initial);
  return <section className="card panel" style={{ marginTop: "1rem" }}><h2>{d.category}</h2>
    <div className="grid">{categories.map((category) => <form action={action} className="setting-row" key={category.id}>
      <input type="hidden" name="id" value={category.id} /><input type="hidden" name="kind" value={category.kind} />
      <input className="input" name="name" defaultValue={category.name} maxLength={60} required />
      <input name="color" type="color" defaultValue={category.color} aria-label="Color" style={{ width: "2.8rem", height: "2.8rem", border: 0, background: "transparent" }} />
      <button className="button secondary" disabled={pending}>{d.save}</button>
    </form>)}</div>
    <form action={action} className="form-grid" style={{ marginTop: "1rem" }}><div className="field"><label>New category</label><input className="input" name="name" maxLength={60} required /></div><div className="field"><label>Type</label><select className="input" name="kind"><option value="expense">{d.expense}</option><option value="income">{d.incomeType}</option></select></div><input type="hidden" name="color" value="#5b8cff" /><button className="button"><Plus size={16} />{d.save}</button></form>
    <p className={state.ok ? "positive" : "form-error"} style={{ margin: ".75rem 0 0" }}>{state.message}</p>
  </section>;
}
