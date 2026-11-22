import { NextRequest, NextResponse } from "next/server";
import { parsePeriod, PeriodError } from "@/lib/finance";
import { getFederalCosts } from "@/lib/parliament-costs";
import { getSenateCosts } from "@/lib/senate-finance";
export const maxDuration = 60;
export async function GET(request: NextRequest, { params }: { params: Promise<{ house: string; id: string }> }) {
  const { house, id } = await params;
  if (!["camara", "senado"].includes(house)) return NextResponse.json({ error: "Casa legislativa inválida." }, { status: 400 });
  try { const { year, month } = parsePeriod(request.nextUrl.searchParams.get("year"), request.nextUrl.searchParams.get("month")); return NextResponse.json(await (house === "camara" ? getFederalCosts(id, year, month) : getSenateCosts(id, year, month))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Custos oficiais indisponíveis." }, { status: error instanceof PeriodError ? 400 : 502 }); }
}
