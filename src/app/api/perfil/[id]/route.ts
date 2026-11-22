import { NextResponse } from "next/server";
import { CamaraError, getDeputy } from "@/lib/camara";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getDeputy((await params).id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Perfil indisponível." }, { status: error instanceof CamaraError ? error.status : 502 }); }
}
