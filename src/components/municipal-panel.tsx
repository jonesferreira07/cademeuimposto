"use client";
import { useState } from "react";
import { Building2, Landmark, Search } from "lucide-react";
import type { MunicipalDataset, MunicipalElection, Municipality } from "@/lib/municipal";
import { electionDate, normalizeMunicipalSearch } from "@/lib/municipal";
import { Failure, Loading, Pager } from "./dashboard-ui";

export function MunicipalPanel({ city, dataset, loading, error, retry }: { city: Municipality | null; dataset: MunicipalDataset | null; loading: boolean; error: string | null; retry: () => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  if (loading) return <Loading text="Abrindo os representantes municipais…" />;
  if (error) return <Failure message={error} retry={retry} />;
  if (!city || !dataset) return <p className="context-note">Escolha uma cidade no mapa ou na busca de municípios.</p>;
  if (city.kind === "district") return <section className="municipal-panel"><h3>{city.name}</h3><p className="municipal-disclaimer">Fernando de Noronha é um distrito estadual de Pernambuco. Não elege prefeito nem vereadores. Sua administração segue regime próprio.</p><a href="https://www.noronha.pe.gov.br/" target="_blank" rel="noreferrer">Administração distrital · fonte oficial ↗</a></section>;
  const council = city.council?.people.filter(person => normalizeMunicipalSearch(`${person.name} ${person.ballotName} ${person.party}`).includes(normalizeMunicipalSearch(query))) || [];
  return <section className="municipal-panel">
    <header className="municipal-heading"><span className="dash-eyebrow">MUNICÍPIO · {dataset.uf}</span><h3>{city.name}</h3><span>IBGE {city.id} · TSE {city.tseCode || "não vinculado"}</span></header>
    <p className="municipal-disclaimer"><strong>Eleitos segundo o TSE.</strong> Exercício atual não confirmado. Partido informado na eleição.</p>
    <h4><Building2 size={16} /> Prefeitura</h4>
    <ElectionNote election={city.mayor} />
    {city.mayor?.people.length === 1 ? city.mayor.people.map(person => <article className="municipal-person municipal-mayor" key={person.id}><span className="municipal-avatar" aria-hidden="true">{person.ballotName.slice(0, 1)}</span><div><strong>{person.ballotName}</strong><span>{person.name}</span><small>{person.party} · prefeito(a) eleito(a)</small></div></article>) : <Missing role="prefeito" />}
    <h4><Landmark size={16} /> Câmara Municipal</h4>
    <ElectionNote election={city.council} />
    {!!city.council?.people.length && <><p className="context-note">{city.council.people.length} vereadores com resultado de eleito na base consultada.</p><div className="dash-search"><Search size={15} /><label className="sr-only" htmlFor="municipal-council-search">Pesquisar vereador ou partido</label><input id="municipal-council-search" placeholder="Buscar vereador ou partido" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></div>{council.slice(page * 5, page * 5 + 5).map(person => <article className="municipal-person" key={person.id}><div><strong>{person.ballotName}</strong><span>{person.name}</span><small>{person.party} · {person.status === "ELEITO" ? "eleito(a)" : person.status === "ELEITO POR QP" ? "eleito(a) por quociente partidário" : "eleito(a) por média"}</small></div></article>)}{!council.length && <p className="small-empty">Nenhum vereador corresponde à busca.</p>}<Pager page={page} total={Math.ceil(council.length / 5)} onPage={setPage} /></>}
    {!city.council?.people.length && <Missing role="vereadores" />}
    <details className="municipal-method"><summary>Fontes e limites desta consulta</summary><p>Base de candidaturas municipais de 2024 do TSE, incluindo eleições suplementares que constam desse arquivo até {electionDate(dataset.asOf)}. Para cada cargo usamos a eleição e o turno mais recentes disponíveis, apenas com situação oficial de eleito. Não inferimos vencedores pela votação e não incluímos suplentes como titulares.</p><p>Os nomes identificam eleitos, não uma confirmação de exercício atual. Afastamentos, sucessões e suplências podem alterar os ocupantes. Uma lista sem eleitos confirmados não significa ausência de representantes. Consulte a prefeitura e a Câmara Municipal para conferir a composição em exercício, especialmente após decisões judiciais. As contas consolidadas do município estão na aba Contas municipais. Salários, despesas individualizadas e custo/dia dos representantes municipais ainda não estão integrados.</p><p>O vínculo IBGE/TSE usa nome normalizado dentro da UF; diferenças de grafia têm correspondências explícitas registradas no arquivo de auditoria. Os códigos das duas fontes são distintos.</p><p>Geração dos arquivos TSE: {dataset.tseGeneratedAt.join("; ")}. Consulta/importação: {electionDate(dataset.asOf)}. A fotografia não se atualiza em tempo real.</p><a href="/data/municipal/manifest.json" target="_blank" rel="noreferrer">Auditoria e cobertura por estado ↗</a></details>
    <div className="panel-source"><a href={dataset.sources.election} target="_blank" rel="noreferrer">TSE · candidaturas e resultados oficiais ↗</a><a href={`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${city.id}`} target="_blank" rel="noreferrer">IBGE · identificação territorial ↗</a><span>Fotografia da base em {electionDate(dataset.asOf)}</span></div>
  </section>;
}
function ElectionNote({ election }: { election: MunicipalElection | null }) {
  return election ? <p className="municipal-election">{election.supplementary ? "Eleição suplementar" : "Eleição municipal"} de {electionDate(election.date)} · {election.turn}º turno</p> : null;
}
function Missing({ role }: { role: string }) {
  return <p className="municipal-disclaimer">O arquivo consultado não permite confirmar um resultado de eleito para {role}. Isso não significa cargo vago. Confira a composição atual nos órgãos municipais.</p>;
}
