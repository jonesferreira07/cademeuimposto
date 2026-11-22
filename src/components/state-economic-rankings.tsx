"use client";
import { useState } from "react";
import { money, months } from "@/lib/finance";
import type { stateGdpRanking, unionTransferRanking } from "@/lib/state-economy";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
type Ranking = ReturnType<typeof stateGdpRanking> | Awaited<ReturnType<typeof unionTransferRanking>>;
export function StateEconomicRankings({ metric, year, month, onSelect }: { metric: "gdp" | "union"; year: number; month: string; onSelect: (uf: string) => void }) {
  const result = useData<Ranking>(`/api/ranking?scope=${metric}&year=${year}&month=${month}`), [page, setPage] = useState(0), data = result.data;
  return result.loading ? <Loading text={metric === "union" ? "Conferindo repasses das 27 UFs no mesmo bimestre…" : "Consultando o PIB oficial das 27 UFs…"} /> : result.error ? <Failure message={result.error} retry={result.retry} /> : data && <>
    <h3 className="comparison-caption">{metric === "gdp" ? `Quem mais produz · PIB de ${data.year}` : `Quem mais recebeu da União · ${data.year}`}</h3>
    <p className="context-note">{data.kind === "union" ? `Janeiro a ${months[data.endMonth! - 1].toLowerCase()} · mesmo bimestre para as 27 UFs. ` : "IBGE: 2023 é o último ano publicado para as 27 UFs. O PIB por estado de 2025 ainda não foi publicado. "}Ordem do maior para o menor valor.</p>
    <div className="state-ranking-header"><span>Estado / Distrito Federal</span><span>{metric === "gdp" ? "PIB" : "Recebido da União"}</span></div><div className="state-ranking-rows">{data.records.slice(page * 7, page * 7 + 7).map(row => <article key={row.uf} className="state-ranking-row"><button onClick={() => onSelect(row.uf)} aria-label={`Explorar ${row.name}`}><span className="ranking-place">{row.rank}º</span><span className="state-ranking-name">{row.name}<small>{row.uf}</small></span><strong title={money(row.value)}>{money(row.value, true)}</strong></button><a href={data.kind === "union" && "source" in row ? row.source : data.source} target="_blank" rel="noreferrer">{metric === "union" ? `Relatório de ${row.name} · Tesouro` : `PIB de ${row.name} · IBGE`} ↗</a></article>)}</div>
    <Pager page={page} total={Math.ceil(data.records.length / 7)} onPage={setPage} />
    <p className="context-note">{data.note}</p><a className="text-source" href={data.source} target="_blank" rel="noreferrer">{metric === "gdp" ? "IBGE · PIB das unidades da federação" : "Tesouro · RREO declarado pelos estados"} ↗</a>
  </>;
}
