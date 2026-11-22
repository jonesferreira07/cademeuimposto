import { NextRequest, NextResponse } from "next/server";
import { getStateTaxRanking } from "@/lib/tax-counter";
import { getGlobalTaxRanking } from "@/lib/rankings";
import { stateGdpRanking, unionTransferRanking } from "@/lib/state-economy";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope && !["global", "gdp", "union"].includes(scope)) return NextResponse.json({ error: "Ranking inválido." }, { status: 400 });
    const result = scope === "gdp" ? stateGdpRanking() : scope === "global" ? getGlobalTaxRanking() : scope === "union" ? await (async () => { const { year, month } = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month")); return unionTransferRanking(year, month); })() : await getStateTaxRanking();
    return NextResponse.json(result, { headers: { "Cache-Control": `public, s-maxage=${scope === "global" || scope === "gdp" ? 86400 : scope === "union" ? 3600 : 60}` } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ranking indisponível." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
