import Decimal from "decimal.js";
import type { ExchangeRate } from "@/lib/finance/types";

type NextFetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };
type RateFetcher = (input: string | URL | Request, init?: NextFetchInit) => Promise<Response>;

interface FrankfurterRow { date?: unknown; base?: unknown; quote?: unknown; rate?: unknown; }

function normalizeRow(value: FrankfurterRow, expectedBase: string, expectedQuote: string): ExchangeRate {
  const date = typeof value.date === "string" ? value.date : "";
  const base = typeof value.base === "string" ? value.base.toUpperCase() : "";
  const quote = typeof value.quote === "string" ? value.quote.toUpperCase() : "";
  const rate = typeof value.rate === "number" || typeof value.rate === "string" ? String(value.rate) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || base !== expectedBase || quote !== expectedQuote) {
    throw new Error("Exchange-rate provider returned an invalid currency pair.");
  }
  try {
    if (!new Decimal(rate).isPositive()) throw new Error("invalid rate");
  } catch {
    throw new Error("Exchange-rate provider returned an invalid rate.");
  }
  return { base, quote, rate, date, source: "Frankfurter reference rate", stale: isRateStale(date) };
}

function endpointUrl(endpoint: string) {
  return endpoint.replace(/\/$/, "");
}

export function isRateStale(rateDate: string, now = new Date(), maximumAgeDays = 4) {
  const timestamp = Date.parse(`${rateDate}T12:00:00Z`);
  if (!Number.isFinite(timestamp)) return true;
  return now.getTime() - timestamp > maximumAgeDays * 86_400_000;
}

export async function fetchReferenceRate(
  baseCurrency: string,
  quoteCurrency: string,
  options: { endpoint?: string; fetcher?: RateFetcher; date?: string } = {},
) {
  const base = baseCurrency.toUpperCase();
  const quote = quoteCurrency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) throw new Error("Invalid currency pair.");
  const endpoint = endpointUrl(options.endpoint ?? "https://api.frankfurter.dev");
  const suffix = options.date ? `?date=${encodeURIComponent(options.date)}` : "";
  const response = await (options.fetcher ?? (fetch as RateFetcher))(`${endpoint}/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}${suffix}`, {
    next: { revalidate: options.date ? 86_400 : 21_600, tags: [`exchange-rate-${base}-${quote}`] },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Exchange-rate provider is unavailable.");
  return normalizeRow(await response.json() as FrankfurterRow, base, quote);
}

export async function fetchReferenceRateSeries(
  baseCurrency: string,
  quoteCurrency: string,
  from: string,
  to: string,
  options: { endpoint?: string; fetcher?: RateFetcher } = {},
) {
  const base = baseCurrency.toUpperCase();
  const quote = quoteCurrency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error("Invalid exchange-rate series request.");
  }
  const endpoint = endpointUrl(options.endpoint ?? "https://api.frankfurter.dev");
  const query = new URLSearchParams({ from, to, base: base.toLowerCase(), quotes: quote.toLowerCase() });
  const response = await (options.fetcher ?? (fetch as RateFetcher))(`${endpoint}/v2/rates?${query}`, {
    next: { revalidate: 86_400, tags: [`exchange-rate-series-${base}-${quote}-${from}-${to}`] },
    signal: AbortSignal.timeout(7_500),
  });
  if (!response.ok) throw new Error("Historical exchange rates are unavailable.");
  const body = await response.json() as unknown;
  if (!Array.isArray(body)) throw new Error("Exchange-rate provider returned an invalid series.");
  return body.map((row) => normalizeRow(row as FrankfurterRow, base, quote));
}
