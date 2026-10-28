import { NextRequest, NextResponse } from "next/server";
import { parsePeriod, PeriodError } from "@/lib/finance";
import { parliamentRanking } from "@/lib/parliament-ranking";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const house = request.nextUrl.searchParams.get("house") || "camara", uf = request.nextUrl.searchParams.get("uf")?.toUpperCase() || null;
  if (!["camara","senado"].includes(house)) return NextResponse.json({error:"Casa legislativa inválida."},{status:400});
  try {
    if (request.nextUrl.searchParams.get("month") && request.nextUrl.searchParams.get("month") !== "all") return NextResponse.json({error:"O ranking parlamentar é acumulado desde janeiro de 2026 e não aceita filtro mensal."},{status:400});
    const {year}=parsePeriod(request.nextUrl.searchParams.get("year"),request.nextUrl.searchParams.get("month"));
    return NextResponse.json(await parliamentRanking(house as "camara"|"senado",year,uf));
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Ranking parlamentar indisponível."},{status:error instanceof PeriodError?400:502}); }
}
