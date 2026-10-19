export type Currency = "RSD" | "EUR" | "USD" | (string & {});
export type AccountKind = "cash" | "bank" | "savings" | "investment";
export type EventType =
  | "expense" | "income" | "transfer" | "opening_balance" | "balance_adjustment"
  | "investment_contribution" | "investment_withdrawal" | "currency_conversion";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  kind: AccountKind;
  sort_order: number;
  archived_at: string | null;
  balance: string;
  latest_valuation?: string | null;
  valuation_date?: string | null;
}

export interface LedgerEvent {
  id: string;
  event_type: EventType;
  effective_date: string;
  description: string | null;
  entries: Array<{
    id: string;
    amount: string;
    currency: Currency;
    account_id: string;
    category_id: string | null;
    account?: { name: string } | null;
    category?: { name: string; color: string } | null;
  }>;
  transfer?: {
    source_account_id: string;
    destination_account_id: string;
    source_amount: string;
    destination_amount: string;
    effective_rate: string;
  } | null;
}

export interface ExchangeRate {
  base: Currency;
  quote: Currency;
  rate: string;
  date: string;
  source: string;
  stale?: boolean;
}
