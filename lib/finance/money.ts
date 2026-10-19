import Decimal from "decimal.js";
import type { Currency } from "@/lib/finance/types";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -30, toExpPos: 30 });

const MINOR_UNITS: Record<string, number> = { RSD: 2, EUR: 2, USD: 2 };

export function money(value: Decimal.Value) {
  return new Decimal(value);
}

export function roundMoney(value: Decimal.Value, currency: Currency) {
  return money(value).toDecimalPlaces(MINOR_UNITS[currency] ?? 2, Decimal.ROUND_HALF_EVEN);
}

export function formatMoney(value: Decimal.Value, currency: Currency, language: "sr-Latn" | "en" = "sr-Latn") {
  const locale = language === "sr-Latn" ? "sr-Latn-RS" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: MINOR_UNITS[currency] ?? 2,
    maximumFractionDigits: MINOR_UNITS[currency] ?? 2
  }).format(money(value).toNumber());
}

export function convert(value: Decimal.Value, rate: Decimal.Value, targetCurrency: Currency) {
  return roundMoney(money(value).mul(rate), targetCurrency);
}

export function sumMoney(values: Decimal.Value[]) {
  let total = money(0);
  for (const value of values) total = total.plus(value);
  return total;
}

export function calculateAdjustment(current: Decimal.Value, target: Decimal.Value) {
  return money(target).minus(current);
}

export function effectiveRate(sourceAmount: Decimal.Value, destinationAmount: Decimal.Value) {
  const source = money(sourceAmount);
  if (source.lte(0)) throw new Error("Source amount must be positive.");
  return money(destinationAmount).div(source).toDecimalPlaces(12, Decimal.ROUND_HALF_EVEN);
}

export function investmentProfitLoss(valuation: Decimal.Value, contributions: Decimal.Value, withdrawals: Decimal.Value) {
  return money(valuation).plus(withdrawals).minus(contributions);
}
