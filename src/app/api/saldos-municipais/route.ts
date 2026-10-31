import { NextRequest, NextResponse } from "next/server";
import { parsePeriod, PeriodError } from "@/lib/finance";
import { MunicipalFinanceError } from "@/lib/municipal-finance";
import { getMunicipalBalancePage } from "@/lib/municipal-balance-server";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    const { year, month } = parsePeriod(query.get("year"), query.get("month"));
    const page = await getMunicipalBalancePage(query.get("uf") || "", year, month, Number(query.get("offset") || 0), query.has("period") ? Number(query.get("period")) : undefined, request.signal);
    return NextResponse.json(page, { headers: { "Cache-Control": page.records.some(row => row.status === "error") ? "no-store" : "public, s-maxage=3600" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível comparar os municípios." }, { status: error instanceof PeriodError ? 400 : error instanceof MunicipalFinanceError ? error.status : 502 });
  }
}
