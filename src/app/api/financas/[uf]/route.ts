import { NextRequest, NextResponse } from "next/server";
import { getStateFinance } from "@/lib/treasury";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ uf: string }> }) {
  try {
    const period = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month"));
    return NextResponse.json(await getStateFinance((await params).uf, period.year, period.month), { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível consultar o Tesouro."; return NextResponse.json({ error: message }, { status: /inválid/i.test(message) ? 400 : 502 }); }
}
