import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/finance/money";
import {
  canonicalMoneyInputValue,
  formatNormalizedMoneyInput,
  moneyInputSubmissionValue,
  normalizeMoneyInput,
  normalizeMoneyInputEdit,
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
    expect(formatNormalizedMoneyInput("123456789.7500")).toBe("123,456,789.7500");
    expect(formatNormalizedMoneyInput("-1250000.50")).toBe("-1,250,000.50");
  });

  it.each([
    ["1000", "1,000"],
    ["10000", "10,000"],
    ["100000", "100,000"],
    ["1000000", "1,000,000"],
    ["125871.00", "125,871.00"],
  ])("formats editable amount %s as %s", (value, expected) => {
    expect(formatNormalizedMoneyInput(value)).toBe(expected);
  });

  it("parses localized and pasted amounts to canonical decimal strings", () => {
    expect(normalizeMoneyInput("10.000.000,50", "sr-Latn")).toBe("10000000.50");
    expect(normalizeMoneyInput("1,250,000.50", "en")).toBe("1250000.50");
    expect(normalizeMoneyInput("1,250,000.50", "sr-Latn")).toBe("1250000.50");
    expect(normalizeMoneyInput("-1.250.000,75", "sr-Latn", true)).toBe("-1250000.75");
  });

  it("keeps generated grouping separators stable while typing and deleting", () => {
    let normalized = "";
    let display = "";
    for (const digit of "1000000") {
      const nextDisplay = `${display}${digit}`;
      normalized = normalizeMoneyInputEdit(nextDisplay, display, normalized, "sr-Latn");
      display = formatNormalizedMoneyInput(normalized);
    }
    expect(normalized).toBe("1000000");
    expect(display).toBe("1,000,000");

    normalized = normalizeMoneyInputEdit("1,000,00", display, normalized, "sr-Latn");
    expect(normalized).toBe("100000");
  });

  it("accepts an iPhone comma as an explicit decimal separator", () => {
    const previous = "125,871";
    const normalized = normalizeMoneyInputEdit(`${previous},`, previous, "125871", "sr-Latn");
    expect(normalized).toBe("125871.");
    expect(formatNormalizedMoneyInput(`${normalized}00`)).toBe("125,871.00");
    expect(normalizeMoneyInput("125871,00", "sr-Latn")).toBe("125871.00");
    expect(moneyInputSubmissionValue("125871.00")).toBe("125871.00");
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
