"use client";
import { useState } from "react";
import type { EconomicRanking } from "@/lib/economic-rankings";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
export function EconomicRankings({ metric }: { metric: "interest" | "purchasing" }) {
  const result = useData<EconomicRanking>(`/api/economia?metric=${metric}`), data = result.data;
  const [page, setPage] = useState(0);
  const value = (amount: number) => metric === "interest" ? `${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% a.a.` : `U$ ${amount.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  return result.loading ? <Loading /> : result.error ? <Failure message={result.error} retry={result.retry} /> : data && <>
    <div className="world-highlight"><strong>{data.brazil.rank}º <small>de {data.coverage}</small></strong><span>Brasil · {value(data.brazil.value)}<br />{data.title} · {data.period}</span></div>
    <p className="context-note">{data.note}</p>{metric === "interest" ? <p className="data-notice">Levantamento datado de {data.period}, cenário central da publicação. Não é uma medição em tempo real de hoje. Uma taxa maior não significa melhor desempenho econômico.</p> : <p className="data-notice">U$ neste quadro indica dólar internacional ajustado por PPC, não dólar convertido pelo câmbio comercial. O valor é anual por pessoa; não equivale a salário, dinheiro no bolso ou conversão cambial. A média não mostra desigualdade de renda.</p>}
    <div className="ranking-list">{data.records.slice(page * 7, page * 7 + 7).map(row => <div key={row.rank} className={row.name === "Brasil" ? "is-brazil" : ""}><span className="ranking-place">{row.rank}º</span><span>{row.name}</span><strong>{value(row.value)}</strong></div>)}</div><div className="world-actions"><button onClick={() => setPage(Math.floor((data.brazil.rank - 1) / 7))}>Localizar Brasil</button><Pager page={page} total={Math.ceil(data.coverage / 7)} onPage={setPage} /></div>
    <a className="text-source" href={data.source} target="_blank" rel="noreferrer">{data.publisher} · fonte e metodologia ↗</a><p className="context-note">Referência: {data.period}. Consulta das fontes: 27/10/2026. Os rankings usam universos, unidades e períodos diferentes.</p>
  </>;
}
