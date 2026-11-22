import { NextRequest, NextResponse } from "next/server";
import { verifyReceiptToken } from "@/lib/advertising/receipt-token";
import { adCheckout } from "@/lib/advertising/checkout";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const host = request.headers.get("host"), expected = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
  if (request.headers.get("origin") !== expected) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 8192) return NextResponse.json({ error: "Referência inválida." }, { status: 413 });
  try {
    // Não utiliza valores, destinatários ou dados do Pix fornecidos pelo navegador.
    const text = await request.text();
    if (text.length > 8192) return NextResponse.json({ error: "Referência inválida." }, { status: 413 });
    const claims = verifyReceiptToken(String(JSON.parse(text).token || ""));
    return NextResponse.json(await adCheckout(claims.id, claims.input, claims.issuedAt), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "O pedido salvo expirou ou é inválido. Se já pagou, informe o código do pedido à equipe por e-mail." }, { status: 400 });
  }
}
