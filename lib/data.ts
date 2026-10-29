import "server-only";
import Decimal from "decimal.js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { requireOwner } from "@/lib/auth";
import type { Account, LedgerEvent } from "@/lib/finance/types";
import type { ExchangeRate } from "@/lib/finance/types";
import { fetchReferenceRate, fetchReferenceRateSeries, isRateStale } from "@/lib/finance/exchange-rates";

const getCachedReferenceRate = unstable_cache(
  async (base: string, quote: string, endpoint?: string) => fetchReferenceRate(base, quote, { endpoint }),
  ["frankfurter-latest-rate"],
  { revalidate: 21_600 },
);

const getCachedReferenceRateSeries = unstable_cache(
  async (base: string, quote: string, from: string, to: string, endpoint?: string) => fetchReferenceRateSeries(base, quote, from, to, { endpoint }),
  ["frankfurter-historical-rates"],
  { revalidate: 86_400 },
);

type RawAccount = Omit<Account, "balance">;

export const getSettings = cache(async function getSettings() {
  const { supabase, user } = await requireOwner();
  const { data } = await supabase.from("user_settings").select("*").eq("owner_id", user.id).maybeSingle();
  return data as { language: "sr-Latn" | "en"; display_currency: string; tracking_start_date: string | null; onboarding_complete: boolean } | null;
});

export const getAccounts = cache(async function getAccounts(includeArchived = false): Promise<Account[]> {
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
});

export const getCategories = cache(async function getCategories() {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.from("categories").select("id,name,kind,color,archived_at").is("archived_at", null).order("name");
  if (error) throw new Error("Unable to load categories.");
  return data ?? [];
});

export const getEvents = cache(async function getEvents(limit = 100, startDate?: string, endDateExclusive?: string, accountId?: string): Promise<LedgerEvent[]> {
  const { supabase } = await requireOwner();
  if (accountId && !/^[0-9a-f-]{36}$/i.test(accountId)) throw new Error("Invalid account.");
  interface RawEvent {
    id: string; event_type: LedgerEvent["event_type"]; effective_date: string; description: string | null; updated_at: string;
    ledger_entries: Array<{ id: string; amount: string; currency: string; account_id: string; category_id: string | null; accounts: { name: string } | Array<{ name: string }> | null; categories: { name: string; color: string } | Array<{ name: string; color: string }> | null }>;
    transfer_details: LedgerEvent["transfer"] | Array<NonNullable<LedgerEvent["transfer"]>> | null;
  }
  const allData: RawEvent[] = [];
  const batchSize = 1000;
  for (let start = 0; start < limit; start += batchSize) {
    const end = Math.min(start + batchSize, limit) - 1;
    const selection = accountId
      ? "id,event_type,effective_date,description,updated_at,ledger_entries!inner(id,amount,currency,account_id,category_id,accounts(name),categories(name,color)),transfer_details(source_account_id,destination_account_id,source_amount,destination_amount,effective_rate)"
      : "id,event_type,effective_date,description,updated_at,ledger_entries(id,amount,currency,account_id,category_id,accounts(name),categories(name,color)),transfer_details(source_account_id,destination_account_id,source_amount,destination_amount,effective_rate)";
    let query = supabase
      .from("financial_events")
      .select(selection)
      .order("effective_date", { ascending: false }).order("created_at", { ascending: false });
    if (startDate) query = query.gte("effective_date", startDate);
    if (endDateExclusive) query = query.lt("effective_date", endDateExclusive);
    if (accountId) query = query.eq("ledger_entries.account_id", accountId);
    const { data, error } = await query.range(start, end);
    if (error) throw new Error("Unable to load transactions.");
    const page = (data ?? []) as unknown as RawEvent[];
    allData.push(...page);
    if (page.length < end - start + 1) break;
  }
  return allData.map((event) => ({
    id: event.id, event_type: event.event_type, effective_date: event.effective_date, description: event.description, updated_at: event.updated_at,
    entries: (event.ledger_entries ?? []).map((entry) => ({
      id: entry.id, amount: entry.amount, currency: entry.currency, account_id: entry.account_id, category_id: entry.category_id,
      account: Array.isArray(entry.accounts) ? entry.accounts[0] : entry.accounts,
      category: Array.isArray(entry.categories) ? entry.categories[0] : entry.categories
    })),
    transfer: Array.isArray(event.transfer_details) ? (event.transfer_details[0] ?? null) : event.transfer_details
  })) as LedgerEvent[];
});

export async function getExchangeRates(displayCurrency: string, baseCurrencies: string[] = []) {
  const { supabase } = await requireOwner();
  const { data } = await supabase.from("exchange_rates").select("base_currency,quote_currency,rate,rate_date,source,is_actual")
    .or(`quote_currency.eq.${displayCurrency},base_currency.eq.${displayCurrency}`).order("rate_date", { ascending: false }).limit(60);
  const databaseFallbacks = new Map<string, ExchangeRate>();
  for (const row of data ?? []) {
    const isDirect = row.quote_currency === displayCurrency;
    const base = isDirect ? row.base_currency : row.quote_currency;
    if (!databaseFallbacks.has(base)) databaseFallbacks.set(base, {
      base,
      quote: displayCurrency,
      rate: isDirect ? row.rate : new Decimal(1).div(row.rate).toDecimalPlaces(12).toFixed(),
      date: row.rate_date,
      source: row.source,
      stale: isRateStale(row.rate_date),
    });
  }
  const latest = new Map<string, ExchangeRate>();
  latest.set(displayCurrency, { base: displayCurrency, quote: displayCurrency, rate: "1", date: new Date().toISOString().slice(0, 10), source: "Identity", stale: false });
  const currencies = [...new Set(baseCurrencies.map((currency) => currency.toUpperCase()).filter((currency) => currency !== displayCurrency))];
  await Promise.all(currencies.map(async (currency) => {
    try {
      latest.set(currency, await getCachedReferenceRate(currency, displayCurrency, process.env.EXCHANGE_RATE_API_URL));
    } catch {
      const fallback = databaseFallbacks.get(currency);
      if (fallback) latest.set(currency, fallback);
    }
  }));
  return latest;
}

export async function getReportReferenceData(displayCurrency: string, baseCurrencies: string[] = [], year?: number) {
  const { supabase } = await requireOwner();
  const [{ data: rates }, { data: valuations }] = await Promise.all([
    supabase.from("exchange_rates").select("base_currency,quote_currency,rate,rate_date,source,is_actual").or(`quote_currency.eq.${displayCurrency},base_currency.eq.${displayCurrency}`).order("rate_date", { ascending: true }),
    supabase.from("investment_valuations").select("account_id,amount,currency,valuation_date").order("valuation_date", { ascending: true })
  ]);
  const combinedRates = (rates ?? []).map((rate) => rate.quote_currency === displayCurrency ? rate : ({
    ...rate,
    base_currency: rate.quote_currency,
    quote_currency: displayCurrency,
    rate: new Decimal(1).div(rate.rate).toDecimalPlaces(12).toFixed(),
  }));
  const currentYear = new Date().getUTCFullYear();
  if (year && year <= currentYear) {
    const from = `${year - 1}-12-15`;
    const to = year === currentYear ? new Date().toISOString().slice(0, 10) : `${year}-12-31`;
    const currencies = [...new Set([
      ...baseCurrencies,
      ...(valuations ?? []).map((valuation) => valuation.currency),
    ].map((currency) => currency.toUpperCase()).filter((currency) => currency !== displayCurrency))];
    const referenceSeries = await Promise.allSettled(currencies.map((currency) => getCachedReferenceRateSeries(currency, displayCurrency, from, to, process.env.EXCHANGE_RATE_API_URL)));
    for (const result of referenceSeries) {
      if (result.status !== "fulfilled") continue;
      for (const rate of result.value) combinedRates.push({
        base_currency: rate.base,
        quote_currency: rate.quote,
        rate: rate.rate,
        rate_date: rate.date,
        source: rate.source,
        is_actual: false,
      });
    }
  }
  combinedRates.sort((a, b) => a.rate_date.localeCompare(b.rate_date) || Number(a.is_actual) - Number(b.is_actual));
  return { rates: combinedRates, valuations: valuations ?? [] };
}
