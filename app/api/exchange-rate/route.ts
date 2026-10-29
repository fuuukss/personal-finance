import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth";
import { fetchReferenceRate } from "@/lib/finance/exchange-rates";

export async function GET(request: NextRequest) {
  await requireOwner();
  const base = request.nextUrl.searchParams.get("base")?.toUpperCase();
  const quote = request.nextUrl.searchParams.get("quote")?.toUpperCase();
  if (!base || !quote || !/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) {
    return NextResponse.json({ error: "Invalid currency pair." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const data = await fetchReferenceRate(base, quote, { endpoint: process.env.EXCHANGE_RATE_API_URL });
    return NextResponse.json({ ...data, indicative: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Rate unavailable. Enter the actual received amount manually." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
