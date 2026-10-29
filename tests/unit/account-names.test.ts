import { describe, expect, it } from "vitest";
import { displayAccountName } from "@/lib/i18n/account-names";

describe("default account-name localization", () => {
  it("localizes only known default names", () => {
    expect(displayAccountName("RSD Cash", "sr-Latn")).toBe("Dinarski keš");
    expect(displayAccountName("RSD Card", "sr-Latn")).toBe("Dinarska kartica");
    expect(displayAccountName("EUR Savings", "sr-Latn")).toBe("EUR štednja");
    expect(displayAccountName("USD Savings", "sr-Latn")).toBe("USD štednja");
  });

  it("never rewrites a custom account name", () => {
    expect(displayAccountName("Putni fond", "sr-Latn")).toBe("Putni fond");
    expect(displayAccountName("Putni fond", "en")).toBe("Putni fond");
  });
});
