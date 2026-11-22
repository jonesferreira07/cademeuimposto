import { NextRequest, NextResponse } from "next/server";
import { getMunicipalFinance, MunicipalFinanceError } from "@/lib/municipal-finance";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const period = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month"));
    return NextResponse.json(await getMunicipalFinance((await params).id, period.year, period.month), { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar as contas municipais." }, { status: error instanceof PeriodError ? 400 : error instanceof MunicipalFinanceError ? error.status : 502 });
  }
}
