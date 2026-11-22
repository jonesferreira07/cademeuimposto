import { NextRequest, NextResponse } from "next/server";
import { CamaraError, getDeputies } from "@/lib/camara";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  try { const data = await getDeputies({ uf: params.get("uf") || undefined, q: params.get("q") || undefined, page: params.get("page") ?? undefined }); return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof CamaraError ? error.message : "Não foi possível consultar a Câmara.", source: "https://dadosabertos.camara.leg.br" }, { status: error instanceof CamaraError ? error.status : 500 }); }
}
