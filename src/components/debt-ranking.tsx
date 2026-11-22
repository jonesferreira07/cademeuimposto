"use client";
import { useState } from "react";
import { money, months } from "@/lib/finance";
import type { PublicDebt } from "@/lib/public-debt";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
export function DebtRanking(){
 const result=useData<PublicDebt>("/api/divida?year=2026"),[page,setPage]=useState(0),data=result.data;
 return result.loading?<Loading text="Conferindo Banco Central e dívida das 27 UFs no Tesouro…"/>:result.error?<Failure message={result.error} retry={result.retry}/>:data&&<section>
  <div className="latest-national debt-national"><span>Brasil · Dívida Bruta do Governo Geral</span><strong>{money(data.national.gross,true)}</strong><b>{data.national.gdpPercent.toLocaleString("pt-BR",{maximumFractionDigits:2})}% do PIB</b><p>Estoque de {months[Number(data.national.date.slice(3,5))-1].toLowerCase()}/2026 · último mês publicado pelo BC na consulta.{data.national.origin==="verified-snapshot"?" Consulta ao vivo indisponível: base oficial conferida em "+new Date(data.national.checkedAt).toLocaleDateString("pt-BR")+".":""}</p><a href={data.national.source} target="_blank" rel="noreferrer">Banco Central · conceitos e publicação ↗</a><a href={data.national.amountSource} target="_blank" rel="noreferrer">Série oficial em reais · SGS 13761 ↗</a></div>
  <h3 className="comparison-caption">Estados e DF · maior dívida consolidada</h3><p className="context-note">Saldo ao fim de {months[data.regional.period*4-1].toLowerCase()}/2026 · {data.regional.period}º quadrimestre · mesma referência para as 27 UFs. Valores nominais; estados maiores podem ter maior dívida. {data.regional.origin==="verified-snapshot"?`Consulta ao vivo indisponível: base oficial conferida em ${new Date(data.regional.checkedAt).toLocaleDateString("pt-BR")}.`:"Consultado diretamente no Tesouro."}</p>
  <div className="state-ranking-rows">{data.regional.records.slice(page*7,page*7+7).map(row=><article className="state-ranking-row debt-state-row" key={row.uf}><div><span className="ranking-place">{row.rank}º</span><span className="state-ranking-name">{row.name}<small>{row.uf}</small></span><strong title={money(row.gross)}>{money(row.gross,true)}</strong></div><p>Dívida líquida (DCL): <b>{money(row.net)}</b></p><a href={row.source} target="_blank" rel="noreferrer">{row.name} · RGF no Tesouro ↗</a></article>)}</div><Pager page={page} total={4} onPage={setPage}/><details className="method-details"><summary>O que esses valores representam?</summary><p>{data.note}</p></details>
 </section>;
}
