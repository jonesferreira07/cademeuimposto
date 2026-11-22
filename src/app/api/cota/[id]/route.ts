import { NextRequest, NextResponse } from "next/server";
import { getQuotaComparison } from "@/lib/quota";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const period = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month")); return NextResponse.json(await getQuotaComparison((await params).id, period.year, period.month)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Comparação de cota indisponível." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
