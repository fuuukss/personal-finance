"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { clearRecoveryAuthorization, hasRecoveryAuthorization } from "@/lib/auth/recovery-server";
import { sessionIdFromAccessToken, validateRecoveryPasswords } from "@/lib/auth/recovery";
import { accountSchema, adjustmentSchema, categorySchema, eventSchema, transferSchema, updateEventSchema, valuationSchema } from "@/lib/validation/finance";
import { getDictionary } from "@/lib/i18n/server";

export type ActionState = { ok: boolean; message: string; fieldErrors?: Record<string, string[]> };
export type RecoveryActionState = { ok: boolean; message: string };
const initialError: ActionState = { ok: false, message: "Invalid request." };

async function assertTrustedOrigin() {
  const origin = (await headers()).get("origin");
  const configured = process.env.APP_ORIGIN;
  if (configured && (!origin || new URL(origin).origin !== new URL(configured).origin)) {
    throw new Error("Invalid request origin.");
  }
}

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) return initialError;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Unable to sign in with those credentials." };
  const { data: allowed } = await supabase.rpc("is_current_owner");
  if (!allowed) {
    await supabase.auth.signOut();
    return { ok: false, message: "Unable to sign in with those credentials." };
  }
  redirect("/");
}

export async function updateRecoveryPasswordAction(
  _state: RecoveryActionState,
  formData: FormData,
): Promise<RecoveryActionState> {
  await assertTrustedOrigin();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const validationError = validateRecoveryPasswords(password, confirmation);
  if (validationError) return { ok: false, message: validationError };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Recovery link je nevažeći ili je istekao." };
  const { data: { session } } = await supabase.auth.getSession();
  const sessionId = sessionIdFromAccessToken(session?.access_token);
  if (!sessionId) return { ok: false, message: "Recovery link je nevažeći ili je istekao." };

  let recoveryAuthorized = false;
  try {
    recoveryAuthorized = await hasRecoveryAuthorization(user.id, sessionId);
  } catch {
    return { ok: false, message: "Resetovanje lozinke trenutno nije dostupno." };
  }
  if (!recoveryAuthorized) return { ok: false, message: "Recovery link je nevažeći ili je istekao." };

  const { data: allowed, error: ownerError } = await supabase.rpc("is_current_owner");
  if (ownerError || !allowed) {
    await clearRecoveryAuthorization();
    return { ok: false, message: "Recovery link je nevažeći ili je istekao." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: "Lozinka nije promenjena. Zatražite novi recovery link i pokušajte ponovo." };

  await clearRecoveryAuthorization();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?reset=success");
}

export async function logoutAction() {
  await assertTrustedOrigin();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function createEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = eventSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the entered values.", fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_financial_event", {
    p_event_type: value.eventType, p_account_id: value.accountId, p_amount: value.amount,
    p_category_id: value.categoryId, p_effective_date: value.effectiveDate,
    p_description: value.description, p_idempotency_key: value.idempotencyKey
  });
  if (error) return { ok: false, message: "Transaction could not be saved." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Transaction saved." };
}

export async function createTransferAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = transferSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the transfer values.", fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { data: transferAccounts } = await supabase.from("accounts").select("id,currency").in("id", [value.sourceAccountId, value.destinationAccountId]);
  const { error } = await supabase.rpc("create_transfer", {
    p_source_account_id: value.sourceAccountId, p_destination_account_id: value.destinationAccountId,
    p_source_amount: value.sourceAmount, p_destination_amount: value.destinationAmount,
    p_effective_date: value.effectiveDate, p_description: value.description, p_idempotency_key: value.idempotencyKey
  });
  if (error) return { ok: false, message: "Transfer could not be saved." };
  const source = transferAccounts?.find((account) => account.id === value.sourceAccountId);
  const destination = transferAccounts?.find((account) => account.id === value.destinationAccountId);
  if (source && destination && source.currency !== destination.currency) {
    const rate = (Number(value.destinationAmount) / Number(value.sourceAmount)).toFixed(12);
    await supabase.from("exchange_rates").upsert({
      rate_date: value.effectiveDate, base_currency: source.currency, quote_currency: destination.currency,
      rate, source: "Recorded transfer", is_actual: true
    }, { onConflict: "owner_id,rate_date,base_currency,quote_currency,source" });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Transfer saved." };
}

export async function createAccountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const { dictionary: d } = await getDictionary();
  const parsed = accountSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: d.accountValuesInvalid, fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_account_with_opening_balance", {
    p_name: value.name, p_currency: value.currency, p_kind: value.kind,
    p_opening_balance: value.openingBalance, p_start_date: value.startDate, p_idempotency_key: crypto.randomUUID()
  });
  if (error?.code === "23505") return { ok: false, message: d.accountNameInUse };
  if (error) return { ok: false, message: d.accountCreateFailed };
  revalidatePath("/", "layout");
  return { ok: true, message: d.accountCreated };
}

export async function removeOrArchiveAccountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const { dictionary: d } = await getDictionary();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: d.accountNotFound };
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.rpc("remove_or_archive_account", { p_account_id: id });
  if (error?.code === "P0002") return { ok: false, message: d.accountNotFound };
  if (error?.code === "P2001") return { ok: false, message: d.accountHasValuations };
  if (error?.code === "P2002") return { ok: false, message: d.accountHasTransfers };
  if (error?.code === "P2003") return { ok: false, message: d.accountHasTransactions };
  if (error) return { ok: false, message: d.accountRemoveFailed };
  revalidatePath("/", "layout");
  redirect(data === "archived" ? "/accounts?account=archived" : "/accounts?account=deleted");
}

export async function renameAccountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const { dictionary: d } = await getDictionary();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || name.length < 1 || name.length > 80) return { ok: false, message: d.accountNameInvalid };
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("rename_account", { p_account_id: id, p_name: name });
  if (error?.code === "23505") return { ok: false, message: d.accountNameInUse };
  if (error?.code === "P0002") return { ok: false, message: d.accountNotFound };
  if (error) return { ok: false, message: d.accountRenameFailed };
  revalidatePath("/", "layout");
  return { ok: true, message: d.accountRenamed };
}

export async function restoreAccountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const { dictionary: d } = await getDictionary();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: d.accountNotFound };
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("restore_account", { p_account_id: id });
  if (error?.code === "P0002") return { ok: false, message: d.accountNotFound };
  if (error) return { ok: false, message: d.accountRestoreFailed };
  revalidatePath("/", "layout");
  redirect("/accounts?account=restored");
}

export async function reorderAccountAction(id: string, direction: -1 | 1) {
  await assertTrustedOrigin();
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("reorder_account", { p_account_id: id, p_direction: direction });
  if (error) throw new Error("Account could not be reordered.");
  revalidatePath("/", "layout");
}

export async function reconcileAccountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = adjustmentSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the target balance." };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { error } = await supabase.rpc("reconcile_account_balance", {
    p_account_id: value.accountId, p_target_balance: value.targetBalance,
    p_effective_date: value.effectiveDate, p_description: value.description, p_idempotency_key: crypto.randomUUID()
  });
  if (error) return { ok: false, message: error.code === "22023" ? "Balance already matches." : "Balance could not be adjusted." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Balance adjusted with an explicit ledger entry." };
}

export async function saveCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = categorySchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the category values." };
  const { supabase } = await requireOwner();
  const { id, ...category } = parsed.data;
  const query = id ? supabase.from("categories").update(category).eq("id", id) : supabase.from("categories").insert(category);
  const { error } = await query;
  if (error) return { ok: false, message: "Category could not be saved." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Category saved." };
}

export async function saveValuationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = valuationSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the valuation." };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { data: account } = await supabase.from("accounts").select("currency,kind").eq("id", value.accountId).single();
  if (!account || account.kind !== "investment") return { ok: false, message: "Investment account not found." };
  const { error } = await supabase.from("investment_valuations").upsert({
    account_id: value.accountId, valuation_date: value.valuationDate, amount: value.amount, currency: account.currency, note: value.note
  }, { onConflict: "owner_id,account_id,valuation_date" });
  if (error) return { ok: false, message: "Valuation could not be saved." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Valuation saved." };
}

export async function deleteEventAction(id: string) {
  await assertTrustedOrigin();
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("delete_financial_event", { p_event_id: id });
  if (error) throw new Error("Transaction could not be deleted.");
  revalidatePath("/", "layout");
}

export async function updateEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const parsed = updateEventSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, message: "Check the entered values.", fieldErrors: parsed.error.flatten().fieldErrors };
  const { supabase } = await requireOwner();
  const value = parsed.data;
  const { error } = await supabase.rpc("update_financial_event_v2", {
    p_event_id: value.id,
    p_account_id: value.accountId,
    p_amount: value.amount,
    p_category_id: value.categoryId,
    p_effective_date: value.effectiveDate,
    p_description: value.description,
    p_expected_updated_at: value.expectedUpdatedAt
  });
  if (error?.code === "40001") return { ok: false, message: "Transaction changed elsewhere. Refresh and try again." };
  if (error?.code === "22023" || error?.code === "23514") return { ok: false, message: "Choose an active account with the same currency and check the entered values." };
  if (error) return { ok: false, message: "Transaction could not be updated." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Transaction updated." };
}

export async function updatePreferencesAction(formData: FormData) {
  await assertTrustedOrigin();
  const language = formData.get("language") === "en" ? "en" : "sr-Latn";
  const currency = String(formData.get("displayCurrency") ?? "RSD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency.");
  const { supabase, user } = await requireOwner();
  const { error } = await supabase.from("user_settings").upsert({ owner_id: user.id, language, display_currency: currency });
  if (error) throw new Error("Settings could not be saved.");
  (await cookies()).set("pf_lang", language, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  revalidatePath("/", "layout");
}

export async function completeOnboardingAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertTrustedOrigin();
  const startDate = String(formData.get("startDate") ?? "");
  const rawAccounts = String(formData.get("accounts") ?? "[]");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || rawAccounts.length > 10000) return { ok: false, message: "Check the onboarding values." };
  let accounts: unknown;
  try {
    accounts = JSON.parse(rawAccounts);
  } catch {
    return { ok: false, message: "Check the onboarding values." };
  }
  const { supabase } = await requireOwner();
  const { error } = await supabase.rpc("complete_onboarding", { p_start_date: startDate, p_opening_balances: accounts });
  if (error) return { ok: false, message: "Onboarding could not be completed." };
  revalidatePath("/", "layout");
  redirect("/?setup=complete");
}
