import { NextRequest, NextResponse } from "next/server";
import { getCounter } from "@/lib/tax-counter";
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getCounter(request.nextUrl.searchParams.get("uf")), { headers: { "Cache-Control": "public, s-maxage=60" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Contador indisponível." }, { status: 502 }); }
}
