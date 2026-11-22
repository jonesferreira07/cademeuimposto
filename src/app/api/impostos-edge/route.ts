import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/states";
import { brazilDate } from "@/lib/finance";
import { REPORTING_YEAR } from "@/lib/reporting-period";
import { parseCounter, TAX_SOURCE } from "@/lib/tax-counter-schema";

export const runtime = "edge";

// Transporte alternativo: usa a verificação TLS da rede Edge, sem desativar HTTPS
// e sem depender da cadeia Sectigo adicionada manualmente ao Node.
export async function GET(request: NextRequest) {
  const requestedUf = request.nextUrl.searchParams.get("uf");
  const state = requestedUf ? getState(requestedUf) : undefined;
  if (requestedUf && !state) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (brazilDate().year !== REPORTING_YEAR) {
    return NextResponse.json({ error: "O contador desta versão está limitado a 2026." }, { status: 400 });
  }

  const path = state
    ? `/Contador/Estado?estado=${state.uf.toLowerCase()}&ano=${REPORTING_YEAR}`
    : "/Contador/Brasil";
  try {
    const response = await fetch(`${TAX_SOURCE}${path}`, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${TAX_SOURCE}/widget/contador/${state?.uf.toLowerCase() || ""}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      console.error("[impostometro-edge] Origem respondeu", response.status);
      return NextResponse.json({ error: "O provedor do contador está indisponível." }, { status: 502 });
    }
    const sample = parseCounter(await response.json(), state?.uf || null);
    return NextResponse.json(sample, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch (error) {
    const reason = error instanceof Error ? error : new Error(String(error));
    console.error("[impostometro-edge] Falha da consulta", {
      name: reason.name,
      message: reason.message,
      cause: reason.cause instanceof Error ? reason.cause.message : undefined,
    });
    return NextResponse.json({ error: "Não foi possível consultar a estimativa tributária neste momento." }, { status: 502 });
  }
}
