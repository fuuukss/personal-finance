import { describe, expect, it } from "vitest";
import { calculateAdjustment, convert, effectiveRate, investmentProfitLoss, money, roundMoney, sumMoney } from "@/lib/finance/money";

describe("exact money arithmetic", () => {
  it("subtracts an expense without binary floating point drift", () => {
    expect(money("20000").minus("500").toFixed(2)).toBe("19500.00");
  });

  it("creates an explicit reconciliation delta", () => {
    expect(calculateAdjustment("19500", "18000").toFixed(2)).toBe("-1500.00");
  });

  it("uses bankers rounding at currency precision", () => {
    expect(roundMoney("1.005", "EUR").toFixed(2)).toBe("1.00");
    expect(roundMoney("1.015", "EUR").toFixed(2)).toBe("1.02");
  });

  it("converts using decimal multiplication", () => {
    expect(convert("12000", "0.008333333333", "EUR").toFixed(2)).toBe("100.00");
  });

  it("calculates the actual effective transfer rate", () => {
    expect(effectiveRate("12000", "100").toFixed(12)).toBe("0.008333333333");
  });

  it("rejects a non-positive source amount", () => {
    expect(() => effectiveRate("0", "100")).toThrow();
  });

  it("sums decimal inputs exactly", () => {
    expect(sumMoney(["0.1", "0.2", "0.3"]).toFixed(2)).toBe("0.60");
  });

  it("separates investment profit from contributions and withdrawals", () => {
    expect(investmentProfitLoss("1450", "1200", "100").toFixed(2)).toBe("350.00");
  });
});
