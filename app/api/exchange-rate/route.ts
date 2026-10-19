import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await requireOwner();
  const base = request.nextUrl.searchParams.get("base")?.toUpperCase();
  const quote = request.nextUrl.searchParams.get("quote")?.toUpperCase();
  if (!base || !quote || !/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) {
    return NextResponse.json({ error: "Invalid currency pair." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  const endpoint = process.env.EXCHANGE_RATE_API_URL ?? "https://api.frankfurter.dev";
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Provider error");
    const data = await response.json() as { date: string; base: string; quote: string; rate: number };
    return NextResponse.json({ date: data.date, base: data.base, quote: data.quote, rate: String(data.rate), source: "Frankfurter reference rate", indicative: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Rate unavailable. Enter the actual received amount manually." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
