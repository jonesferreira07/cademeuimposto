"use client";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Search, UsersRound } from "lucide-react";
import { ParliamentCosts, SenateExpenses } from "./parliament-costs";
import { ParliamentPanel } from "./parliament-panel";
import { DeputyPhoto } from "./deputy-card";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
import { StateRepresentatives } from "./state-representatives";
import type { SenateResult } from "@/lib/senate";

export function RepresentationPanel(props: { uf: string | null; year: number; month: string; periodLabel: string }) {
  const [role, setRole] = useState("federal");
  return <aside className="dash-deputies-panel dash-panel"><div className="representation-heading"><UsersRound size={18} /><h2>Seus representantes</h2>{props.uf && <span>{props.uf}</span>}</div><nav className="representation-tabs" aria-label="Cargo do representante">{[["senate", "Senadores"], ["federal", "Dep. Federais"], ["government", "Governadores"], ["assembly", props.uf === "DF" ? "Dep. Distritais" : "Dep. Estaduais"]].map(([value, label]) => <button key={value} aria-pressed={role === value} onClick={() => setRole(value)}>{label}</button>)}</nav>
    {role === "federal" ? <ParliamentPanel {...props} /> : role === "senate" ? <SenatePanel key={`${props.uf}-${props.year}-${props.month}`} uf={props.uf} year={props.year} month={props.month} /> : <StateRepresentatives key={`${role}-${props.uf}-${props.year}-${props.month}`} uf={props.uf} role={role as "government" | "assembly"} year={props.year} month={props.month} />}
  </aside>;
}
function SenatePanel({ uf, year, month }: { uf: string | null; year: number; month: string }) {
  const [tab, setTab] = useState("costs");
  const result = useData<SenateResult>(`/api/senadores${uf ? `?uf=${uf}` : ""}`);
  const [query, setQuery] = useState(""), [page, setPage] = useState(0), [selected, setSelected] = useState<SenateResult["senators"][number] | null>(null);
  const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rows = result.data?.senators.filter(row => normal(row.name).includes(normal(query))) || [];
  return <section className="senate-panel">{selected ? <><button className="inspector-back" onClick={() => setSelected(null)}><ArrowLeft size={12} /> Voltar aos senadores</button><div className="inspector-person"><DeputyPhoto src={selected.photo} name={selected.name} /><div><h3>{selected.name}</h3><span>{selected.party} · {selected.uf}</span></div></div><div className="panel-tabs" role="tablist" aria-label="Informações do senador"><button role="tab" aria-selected={tab === "costs"} onClick={() => setTab("costs")}>Custo/dia</button><button role="tab" aria-selected={tab === "expenses"} onClick={() => setTab("expenses")}>Despesas</button><button role="tab" aria-selected={tab === "contact"} onClick={() => setTab("contact")}>Contato</button></div>{tab === "costs" ? <ParliamentCosts house="senado" id={selected.id} year={year} month={month} /> : tab === "expenses" ? <SenateExpenses id={selected.id} year={year} month={month} /> : <><p className="context-note">Em exercício, conforme o Senado. Participação: {selected.participation || "não informada"}.</p><div className="civic-links"><a href={selected.profile} target="_blank" rel="noreferrer">Perfil, mandato e contatos oficiais ↗</a><a href="https://www12.senado.leg.br/transparencia/sen/senadores" target="_blank" rel="noreferrer">Transparência do Senado ↗</a>{selected.email && /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(selected.email) && <a href={`mailto:${selected.email}`}>{selected.email}</a>}</div></>}</> : <><div className="dash-search"><Search size={15} /><label htmlFor="senate-query" className="sr-only">Pesquisar senador</label><input id="senate-query" value={query} placeholder="Buscar senador pelo nome" onChange={e => { setQuery(e.target.value); setPage(0); }} /></div>{result.loading ? <Loading /> : result.error ? <Failure message={result.error} retry={result.retry} /> : <><p className="context-note">{rows.length} senadores em exercício{uf ? ` · ${uf}` : " · Brasil"}. Eleitos que ainda não tomaram posse não entram nesta lista.</p>{rows.slice(page * 3, page * 3 + 3).map(row => <button className="dash-deputy" key={row.id} onClick={() => setSelected(row)}><DeputyPhoto src={row.photo} name={row.name} /><span><strong>{row.name}</strong><small>{row.party} · {row.uf}</small></span><ChevronRight size={17} /></button>)}{!rows.length && <p className="small-empty">Nenhum senador encontrado.</p>}<Pager page={page} total={Math.ceil(rows.length / 3)} onPage={setPage} /></>}</>}
    <div className="panel-source"><a href={result.data?.source || "https://www12.senado.leg.br/dados-abertos"} target="_blank" rel="noreferrer">Senado Federal · dados oficiais ↗</a>{result.data?.publishedAt && <span>Versão informada pela fonte: {result.data.publishedAt}</span>}</div></section>;
}
