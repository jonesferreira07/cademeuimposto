import { NextRequest, NextResponse } from "next/server";
import { getSenators } from "@/lib/senate";
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getSenators(request.nextUrl.searchParams.get("uf"))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Consulta ao Senado indisponível." }, { status: 502 }); }
}
