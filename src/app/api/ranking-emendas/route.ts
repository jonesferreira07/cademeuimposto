import { NextRequest, NextResponse } from "next/server";
import { amendmentRanking, type AmendmentMetric } from "@/lib/amendment-ranking";
import { parsePeriod, PeriodError } from "@/lib/finance";
import { getState } from "@/lib/states";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams, house = params.get("house") || "camara", metric = params.get("metric") || "paid", uf = params.get("uf")?.toUpperCase() || null;
  if (!["camara","senado"].includes(house) || !["paid","committed","liquidated","awaitingLiquidation"].includes(metric) || (uf && !getState(uf)) || (params.has("month") && params.get("month") !== "all")) return NextResponse.json({error:"Seleção inválida. O ranking de emendas é acumulado em 2026."},{status:400});
  try { const {year}=parsePeriod(params.get("year")); return NextResponse.json(await amendmentRanking(house as "camara"|"senado",year,metric as AmendmentMetric,uf)); }
  catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Ranking de emendas indisponível."},{status:error instanceof PeriodError ? 400 : 502}); }
}
