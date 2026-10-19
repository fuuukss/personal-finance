import "server-only";
import Decimal from "decimal.js";
import { requireOwner } from "@/lib/auth";
import type { Account, LedgerEvent } from "@/lib/finance/types";

type RawAccount = Omit<Account, "balance">;

export async function getSettings() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase.from("user_settings").select("*").eq("owner_id", user.id).maybeSingle();
  return data as { language: "sr-Latn" | "en"; display_currency: string; tracking_start_date: string | null; onboarding_complete: boolean } | null;
}

export async function getAccounts(includeArchived = false): Promise<Account[]> {
  const { supabase } = await requireOwner();
  let query = supabase.from("accounts").select("id,name,currency,kind,sort_order,archived_at").order("sort_order");
  if (!includeArchived) query = query.is("archived_at", null);
  const [{ data: accounts, error }, { data: entries }, { data: valuations }] = await Promise.all([
    query,
    supabase.from("ledger_entries").select("account_id,amount"),
    supabase.from("investment_valuations").select("account_id,amount,valuation_date").order("valuation_date", { ascending: false })
  ]);
  if (error) throw new Error("Unable to load accounts.");
  const balances = new Map<string, Decimal>();
  for (const entry of entries ?? []) balances.set(entry.account_id, (balances.get(entry.account_id) ?? new Decimal(0)).plus(entry.amount));
  const latestValuations = new Map<string, { amount: string; date: string }>();
  for (const value of valuations ?? []) if (!latestValuations.has(value.account_id)) latestValuations.set(value.account_id, { amount: value.amount, date: value.valuation_date });
  return ((accounts ?? []) as RawAccount[]).map((account) => ({
    ...account,
    balance: balances.get(account.id)?.toFixed() ?? "0",
    latest_valuation: latestValuations.get(account.id)?.amount ?? null,
    valuation_date: latestValuations.get(account.id)?.date ?? null
  }));
}

export async function getCategories() {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.from("categories").select("id,name,kind,color,archived_at").is("archived_at", null).order("name");
  if (error) throw new Error("Unable to load categories.");
  return data ?? [];
}

export async function getEvents(limit = 100): Promise<LedgerEvent[]> {
  const { supabase } = await requireOwner();
  interface RawEvent {
    id: string; event_type: LedgerEvent["event_type"]; effective_date: string; description: string | null;
    ledger_entries: Array<{ id: string; amount: string; currency: string; account_id: string; category_id: string | null; accounts: { name: string } | Array<{ name: string }> | null; categories: { name: string; color: string } | Array<{ name: string; color: string }> | null }>;
    transfer_details: LedgerEvent["transfer"] | Array<NonNullable<LedgerEvent["transfer"]>> | null;
  }
  const allData: RawEvent[] = [];
  const batchSize = 1000;
  for (let start = 0; start < limit; start += batchSize) {
    const end = Math.min(start + batchSize, limit) - 1;
    const { data, error } = await supabase
      .from("financial_events")
      .select("id,event_type,effective_date,description,ledger_entries(id,amount,currency,account_id,category_id,accounts(name),categories(name,color)),transfer_details(source_account_id,destination_account_id,source_amount,destination_amount,effective_rate)")
      .order("effective_date", { ascending: false }).order("created_at", { ascending: false }).range(start, end);
    if (error) throw new Error("Unable to load transactions.");
    const page = (data ?? []) as unknown as RawEvent[];
    allData.push(...page);
    if (page.length < end - start + 1) break;
  }
  return allData.map((event) => ({
    id: event.id, event_type: event.event_type, effective_date: event.effective_date, description: event.description,
    entries: (event.ledger_entries ?? []).map((entry) => ({
      id: entry.id, amount: entry.amount, currency: entry.currency, account_id: entry.account_id, category_id: entry.category_id,
      account: Array.isArray(entry.accounts) ? entry.accounts[0] : entry.accounts,
      category: Array.isArray(entry.categories) ? entry.categories[0] : entry.categories
    })),
    transfer: Array.isArray(event.transfer_details) ? (event.transfer_details[0] ?? null) : event.transfer_details
  })) as LedgerEvent[];
}

export async function getExchangeRates(displayCurrency: string) {
  const { supabase } = await requireOwner();
  const { data } = await supabase.from("exchange_rates").select("base_currency,quote_currency,rate,rate_date,source,is_actual")
    .eq("quote_currency", displayCurrency).order("rate_date", { ascending: false }).limit(30);
  const latest = new Map<string, string>();
  latest.set(displayCurrency, "1");
  for (const row of data ?? []) if (!latest.has(row.base_currency)) latest.set(row.base_currency, row.rate);
  return latest;
}

export async function getReportReferenceData(displayCurrency: string) {
  const { supabase } = await requireOwner();
  const [{ data: rates }, { data: valuations }] = await Promise.all([
    supabase.from("exchange_rates").select("base_currency,quote_currency,rate,rate_date,source,is_actual").eq("quote_currency", displayCurrency).order("rate_date", { ascending: true }),
    supabase.from("investment_valuations").select("account_id,amount,currency,valuation_date").order("valuation_date", { ascending: true })
  ]);
  return { rates: rates ?? [], valuations: valuations ?? [] };
}
