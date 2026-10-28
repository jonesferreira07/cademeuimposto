import { NextRequest, NextResponse } from "next/server";
import { getAmendments } from "@/lib/amendments";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { year } = parsePeriod(request.nextUrl.searchParams.get("year")); return NextResponse.json(await getAmendments((await params).id, year), { headers: { "Cache-Control": "public, s-maxage=3600" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível consultar a CGU." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
