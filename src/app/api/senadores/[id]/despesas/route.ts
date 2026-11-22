import { NextRequest, NextResponse } from "next/server";
import { parsePeriod, PeriodError } from "@/lib/finance";
import { getSenateExpenses } from "@/lib/senate-finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { year, month } = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month")); return NextResponse.json(await getSenateExpenses((await params).id, year, month)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "CEAPS indisponível." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
