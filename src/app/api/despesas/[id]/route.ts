import { NextRequest, NextResponse } from "next/server";
import { getExpenses } from "@/lib/expenses";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const period = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month"));
    const result = await getExpenses((await params).id, period.year, period.month);
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=1800" } });
  } catch (error) { const message = error instanceof Error ? error.message : "Não foi possível consultar as despesas."; return NextResponse.json({ error: message }, { status: /inválid/i.test(message) ? 400 : 502 }); }
}
