import { NextRequest, NextResponse } from "next/server";
import { economicRanking } from "@/lib/economic-rankings";
export function GET(request: NextRequest) {
  try { return NextResponse.json(economicRanking(request.nextUrl.searchParams.get("metric") || "interest")); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Indicador indisponível." }, { status: 400 }); }
}
