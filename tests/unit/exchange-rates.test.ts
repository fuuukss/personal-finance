import { describe, expect, it, vi } from "vitest";
import { fetchReferenceRate, fetchReferenceRateSeries, isRateStale } from "@/lib/finance/exchange-rates";

describe("Frankfurter exchange rates", () => {
  it("preserves the provider date and decimal rate", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ date: "2026-10-29", base: "EUR", quote: "RSD", rate: 117.1234 }), { status: 200 }));
    const result = await fetchReferenceRate("eur", "rsd", { fetcher });
    expect(result).toMatchObject({ base: "EUR", quote: "RSD", rate: "117.1234", date: "2026-10-29", source: "Frankfurter reference rate" });
  });

  it("fails closed instead of inventing a fallback rate", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ message: "unavailable" }), { status: 503 }));
    await expect(fetchReferenceRate("EUR", "RSD", { fetcher })).rejects.toThrow("unavailable");
  });

  it("rejects a mismatched provider response", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ date: "2026-10-29", base: "USD", quote: "RSD", rate: 101 }), { status: 200 }));
    await expect(fetchReferenceRate("EUR", "RSD", { fetcher })).rejects.toThrow("invalid currency pair");
  });

  it("parses historical series without substituting missing dates", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([
      { date: "2026-10-01", base: "EUR", quote: "RSD", rate: 117.1 },
      { date: "2026-10-02", base: "EUR", quote: "RSD", rate: 117.2 },
    ]), { status: 200 }));
    const result = await fetchReferenceRateSeries("EUR", "RSD", "2026-10-01", "2026-10-02", { fetcher });
    expect(result.map((rate) => rate.date)).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("marks old observations as stale", () => {
    expect(isRateStale("2026-10-20", new Date("2026-10-29T12:00:00Z"))).toBe(true);
    expect(isRateStale("2026-10-27", new Date("2026-10-29T12:00:00Z"))).toBe(false);
  });
});
