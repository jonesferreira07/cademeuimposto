import { NextRequest, NextResponse } from "next/server";
import { stateRepresentatives } from "@/lib/state-representatives";
import { parsePeriod, PeriodError } from "@/lib/finance";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role");
  if (role !== "government" && role !== "assembly") return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
  try { const { year, month } = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month")); return NextResponse.json(await stateRepresentatives(request.nextUrl.searchParams.get("uf")?.toUpperCase() || null, role, year, month)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Dados estaduais indisponíveis." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
