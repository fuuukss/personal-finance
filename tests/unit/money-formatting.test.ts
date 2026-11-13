import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/finance/money";
import {
  canonicalMoneyInputValue,
  formatNormalizedMoneyInput,
  moneyInputSubmissionValue,
  normalizeMoneyInput,
} from "@/lib/finance/money-input";

describe("financial number formatting", () => {
  it.each([
    ["1000", "1.000,00 RSD"],
    ["10000", "10.000,00 RSD"],
    ["1000000", "1.000.000,00 RSD"],
    ["10000000", "10.000.000,00 RSD"],
    ["123456789.75", "123.456.789,75 RSD"],
    ["0", "0,00 RSD"],
    ["-1250000.5", "-1.250.000,50 RSD"],
  ])("formats %s for Serbian financial display", (value, expected) => {
    expect(formatMoney(value, "RSD", "sr-Latn")).toBe(expected);
  });

  it("formats canonical input without changing its precision", () => {
    expect(formatNormalizedMoneyInput("123456789.7500", "sr-Latn")).toBe("123.456.789,7500");
    expect(formatNormalizedMoneyInput("-1250000.50", "en")).toBe("-1,250,000.50");
  });

  it("parses localized and pasted amounts to canonical decimal strings", () => {
    expect(normalizeMoneyInput("10.000.000,50", "sr-Latn")).toBe("10000000.50");
    expect(normalizeMoneyInput("1,250,000.50", "en")).toBe("1250000.50");
    expect(normalizeMoneyInput("1,250,000.50", "sr-Latn")).toBe("1250000.50");
    expect(normalizeMoneyInput("-1.250.000,75", "sr-Latn", true)).toBe("-1250000.75");
  });

  it("preserves canonical values with three or more decimal places", () => {
    expect(canonicalMoneyInputValue("1234.567", "sr-Latn")).toBe("1234.567");
    expect(canonicalMoneyInputValue("1234.567890", "en")).toBe("1234.567890");
  });

  it("submits empty and partial input safely", () => {
    expect(moneyInputSubmissionValue("")).toBe("");
    expect(moneyInputSubmissionValue("-")).toBe("");
    expect(moneyInputSubmissionValue("1234.")).toBe("1234");
  });
});
