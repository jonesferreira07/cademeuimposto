"use client";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { money } from "@/lib/finance";
import { states } from "@/lib/states";
import type { ParliamentRanking } from "@/lib/parliament-ranking";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
import { DeputyPhoto } from "./deputy-card";
export function ParliamentRankings({ year }: { year: number }) {
  const [house,setHouse]=useState("camara"),[uf,setUf]=useState(""),[order,setOrder]=useState("asc"),[page,setPage]=useState(0);
  const result=useData<ParliamentRanking>(`/api/ranking-parlamentar?house=${house}&year=${year}${uf?`&uf=${uf}`:""}`), data=result.data;
  const records=data ? order==="asc"?data.records:data.records.toSorted((a,b)=>b.spent-a.spent||a.name.localeCompare(b.name,"pt-BR")) : [];
  return <section className="parliament-rankings"><div className="ranking-filters"><label>Casa<select value={house} onChange={e=>{setHouse(e.target.value);setPage(0);}}><option value="camara">Deputados federais</option><option value="senado">Senadores</option></select></label><label>Estado<select value={uf} onChange={e=>{setUf(e.target.value);setPage(0);}}><option value="">Brasil</option>{states.map(state=><option key={state.uf} value={state.uf}>{state.name}</option>)}</select></label></div>
    {result.loading?<Loading text="Conferindo a composição e todas as despesas da cota na mesma base oficial…"/>:result.error?<Failure message={result.error} retry={result.retry}/>:data&&<>
      <h3 className="comparison-caption"><Trophy size={18} aria-hidden="true"/> Top 3 · menor gasto publicado</h3><p className="context-note">{data.period.label} · {house==="camara"?"CEAP":"CEAPS"} · comparação provisória. Não representa o custo total nem comprova economicidade.</p>
      <div className="quota-podium">{data.top.map(row=><a key={row.id} href={row.profile} target="_blank" rel="noreferrer"><span className="podium-position">{row.rank}º</span><DeputyPhoto src={row.photo} name={row.name}/><strong>{row.name}</strong><small>{row.party} · {row.uf}</small><b>{money(row.spent)}</b><small>{row.documents} {house === "camara" ? "rubricas" : row.documents === 1 ? "registro" : "registros"} · perfil oficial ↗</small></a>)}</div>
      <p className="context-note">Posição fixa: 1º é o menor gasto publicado. Em caso de empate, a posição é compartilhada.</p><label className="ranking-order">Ordenar por<select value={order} onChange={e=>{setOrder(e.target.value);setPage(0);}}><option value="asc">Menor gasto → maior gasto</option><option value="desc">Maior gasto → menor gasto</option></select></label>
      <div className="ranking-list parliamentary-list">{records.slice(page*7,page*7+7).map(row=><a key={row.id} href={row.profile} target="_blank" rel="noreferrer"><span className="ranking-place">{row.rank}º</span><span>{row.name}<small>{row.party} · {row.uf} · {row.documents} {house === "camara" ? "rubricas" : row.documents === 1 ? "registro" : "registros"}</small></span><strong>{money(row.spent)}</strong></a>)}</div><Pager page={page} total={Math.ceil(records.length/7)} onPage={setPage}/>
      {!records.length&&<p className="small-empty">Sem registros suficientes para classificar neste período.</p>}
      <p className="context-note">{records.length} classificados de {data.rosterCount} nomes na composição atual. {data.withoutRecords} sem registros no período; {data.netRefunds} com saldo negativo por estornos. Esses casos não viram “economia” nem gasto zero.</p>
      <details className="method-details"><summary>Como interpretar o ranking de economicidade</summary><p>{data.note}</p><p>Despesas estaduais e distritais não entram até haver conferência primária e cobertura comparável. A classificação é da cota, não de salários ou do total recebido por cada parlamentar.</p></details><a className="text-source" href={data.source} target="_blank" rel="noreferrer">{house==="camara"?"Câmara · comparativo CEAP, incluindo SIGEPA":"Senado · arquivo completo CEAPS"} ↗</a>
    </>}
  </section>;
}
