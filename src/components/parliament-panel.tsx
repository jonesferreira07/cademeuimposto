"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Database, ExternalLink, FileText, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { DeputyPhoto } from "./deputy-card";
import { getState } from "@/lib/states";
import { fiscalDate, money } from "@/lib/finance";
import type { Deputy, DeputyDetail } from "@/lib/camara";
import type { ExpenseResult } from "@/lib/expenses";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
import { ParliamentCosts } from "./parliament-costs";
import { QuotaOverview, AmendmentPanel, AccountabilityPanel } from "./deputy-accountability";

type DeputyList = { deputies: Deputy[]; hasNext: boolean; page: number; source: string };
export function ParliamentPanel({ uf, year, month, periodLabel }: { uf: string | null; year: number; month: string; periodLabel: string }) {
  const [query, setQuery] = useState(""); const [term, setTerm] = useState("");
  const [deputy, setDeputy] = useState<Deputy | null>(null);
  const [page, setPage] = useState(0); const [remotePage, setRemotePage] = useState(1);
  useEffect(() => { if (query.trim() === term) return; const timeout = setTimeout(() => { setTerm(query.trim()); setPage(0); setRemotePage(1); setDeputy(null); }, 350); return () => clearTimeout(timeout); }, [query, term]);
  const params = new URLSearchParams({ page: String(remotePage) }); if (uf) params.set("uf", uf); if (term) params.set("q", term);
  const list = useData<DeputyList>(uf || term ? `/api/deputados?${params}` : null);
  const records = list.data?.deputies || []; const pages = Math.ceil(records.length / 3);
  const state = getState(uf || "");
  return <section className="federal-representatives">
    {deputy ? <DeputyInspector key={`${deputy.id}-${year}-${month}`} deputy={deputy} year={year} month={month} periodLabel={periodLabel} back={() => setDeputy(null)} /> : <>
      <div className="dash-search"><Search size={15} /><label className="sr-only" htmlFor="dash-search">Pesquisar parlamentar</label><input id="dash-search" value={query} maxLength={100} onChange={e => setQuery(e.target.value)} placeholder={state ? `Buscar em ${state.name}` : "Busque um deputado pelo nome"} />{query && <button aria-label="Limpar pesquisa" onClick={() => setQuery("")}><X size={13} /></button>}</div>
      {!uf && !term ? <div className="panel-intro deputy-intro"><span className="intro-icon"><UsersRound size={30} /></span><h3>Quem decide por você?</h3><p>Escolha seu estado ou pesquise um nome. Abra um parlamentar para consultar sua cota e os documentos de despesa.</p><div className="deputy-intro-tags"><span><FileText size={12} /> Documentos</span><span><Database size={12} /> Gastos reais</span></div><div className="mini-source"><ShieldCheck size={14} /> Direto da Câmara dos Deputados</div></div> : list.loading ? <Loading /> : list.error ? <Failure message={list.error} retry={list.retry} /> : <>
        <div className="list-caption"><span>{records.length}{list.data?.hasNext ? "+" : ""} parlamentares {state ? `· ${uf}` : "encontrados"}</span><span>Nome · A–Z</span></div>
        <div className="dash-deputy-list">{records.slice(page * 3, page * 3 + 3).map(item => <button key={item.id} className="dash-deputy" onClick={() => setDeputy(item)}><DeputyPhoto src={item.urlFoto} name={item.nome} /><span><strong>{item.nome}</strong><small>{item.siglaPartido} <i /> {item.siglaUf}</small></span><ChevronRight size={17} /></button>)}{!records.length && <div className="small-empty">Nenhum parlamentar encontrado. Tente outro nome.</div>}</div>
        <Pager page={page} total={pages} extraNext={list.data?.hasNext} extraPrevious={remotePage > 1} onPage={next => { if (next >= pages && list.data?.hasNext) { setRemotePage(p => p + 1); setPage(0); } else if (next < 0 && remotePage > 1) { setRemotePage(p => p - 1); setPage(33); } else setPage(next); }} />
        <div className="panel-source"><a href={list.data?.source || "https://dadosabertos.camara.leg.br"} target="_blank" rel="noreferrer">Câmara · lista atual <ArrowUpRight size={12} /></a><span>Selecione um nome para consultar despesas.</span></div>
      </>}
    </>}
  </section>;
}

function DeputyInspector({ deputy, year, month, periodLabel, back }: { deputy: Deputy; year: number; month: string; periodLabel: string; back: () => void }) {
  const [tab, setTab] = useState<"costs" | "expenses" | "amendments" | "profile" | "accountability">("costs"); const [page, setPage] = useState(0);
  const [showRecords, setShowRecords] = useState(false);
  const expenses = useData<ExpenseResult>(tab === "expenses" && showRecords ? `/api/despesas/${deputy.id}?year=${year}&month=${month}` : null);
  const profile = useData<DeputyDetail>(tab === "profile" ? `/api/perfil/${deputy.id}` : null);
  const data = expenses.data;
  return <><button className="inspector-back" onClick={back}><ArrowLeft size={12} /> Voltar aos parlamentares</button><div className="inspector-person"><DeputyPhoto src={deputy.urlFoto} name={deputy.nome} /><div><h3>{deputy.nome}</h3><span>{deputy.siglaPartido} · {deputy.siglaUf}</span></div><a href={`https://www.camara.leg.br/deputados/${deputy.id}`} aria-label="Abrir perfil na Câmara" target="_blank" rel="noreferrer"><ArrowUpRight size={17} /></a></div>
    <div className="panel-tabs inspector-tabs" role="tablist" aria-label="Informações do parlamentar"><button role="tab" aria-selected={tab === "costs"} onClick={() => setTab("costs")}>Custo/dia</button><button role="tab" aria-selected={tab === "expenses"} onClick={() => setTab("expenses")}>Cota</button><button role="tab" aria-selected={tab === "amendments"} onClick={() => setTab("amendments")}>Emendas</button><button role="tab" aria-selected={tab === "accountability"} onClick={() => setTab("accountability")}>Cobrar</button><button role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>Contato</button></div>
    {tab === "costs" ? <ParliamentCosts house="camara" id={deputy.id} year={year} month={month} /> : tab === "amendments" ? <AmendmentPanel id={deputy.id} year={year} /> : tab === "accountability" ? <AccountabilityPanel deputy={deputy} year={year} month={month} /> : tab === "expenses" ? <><QuotaOverview id={deputy.id} year={year} month={month} /><button className="records-toggle" aria-expanded={showRecords} onClick={() => setShowRecords(v => !v)}>{showRecords ? "Ocultar documentos do mês/período" : "Ver despesas e documentos do mês/período"}</button>{showRecords && (expenses.loading ? <Loading text="Conferindo todas as páginas de despesas…" /> : expenses.error ? <Failure message={expenses.error} retry={expenses.retry} /> : data && <>
      <div className="expense-total"><span>CEAP · {periodLabel}</span><strong>{data.total == null ? "Sem registros" : money(data.total)}</strong><small>{data.records.length ? `${data.records.length} ${data.records.length === 1 ? "registro" : "registros"} · documentos do subconjunto disponível` : "Nenhum documento neste subconjunto. O total utiliza o comparativo oficial."}</small></div>
      {data.note && <p className="data-notice">{data.note}</p>}{data.totalSource && <a className="text-source" href={data.totalSource} target="_blank" rel="noreferrer">Total e categorias · comparativo com SIGEPA ↗</a>}
      {data.records.length ? <><div className="expense-records">{data.records.slice(page, page + 1).map((item, i) => <article className="expense-row" key={`${item.codDocumento}-${page}-${i}`}><div className="expense-row-top"><span>{fiscalDate(item.dataDocumento)}</span><strong>{money(item.valorLiquido)}</strong></div><h4>{item.tipoDespesa}</h4><p>{item.nomeFornecedor}</p><div className="expense-meta"><span>{item.tipoDocumento || "Documento fiscal"} · ref. {String(item.mes).padStart(2, "0")}/{item.ano}</span>{item.urlDocumento && /^https?:\/\//.test(item.urlDocumento) ? <a href={item.urlDocumento} target="_blank" rel="noreferrer">Comprovante <ExternalLink size={10} /></a> : <span>Sem comprovante na API</span>}</div>{item.valorGlosa != null && item.valorGlosa !== 0 && <small>Documento: {money(item.valorDocumento)} · glosa: {money(item.valorGlosa)}</small>}</article>)}</div><Pager page={page} total={data.records.length} onPage={setPage} /></> : <div className="expense-empty"><FileText size={24} /><p>Escolha outro mês ou “Acumulado em 2026” para ampliar a consulta.</p><small>Ausência de registros não comprova ausência de gasto. Não inclui salários, assessores ou emendas.</small></div>}
      <div className="panel-source"><a href={data.source} target="_blank" rel="noreferrer">Câmara · {data.origin === "archive" ? "arquivo anual CEAP" : "API de despesas"} <ArrowUpRight size={12} /></a><span>{data.publishedAt ? `Arquivo atualizado em ${fiscalDate(data.publishedAt)}. ` : ""}Data do documento fiscal; não do reembolso.</span></div>
    </>)} </> : profile.loading ? <Loading /> : profile.error ? <Failure message={profile.error} retry={profile.retry} /> : profile.data && <div className="inspector-profile"><dl><div><dt>Nome civil</dt><dd>{profile.data.nomeCivil}</dd></div><div><dt>Situação</dt><dd>{profile.data.ultimoStatus.situacao || "Não informado"}</dd></div><div><dt>Gabinete</dt><dd>{profile.data.ultimoStatus.gabinete?.nome || "Não informado"}</dd></div><div><dt>Telefone</dt><dd>{profile.data.ultimoStatus.gabinete?.telefone || "Não informado"}</dd></div><div><dt>E-mail</dt><dd>{profile.data.ultimoStatus.email || profile.data.ultimoStatus.gabinete?.email || "Não informado"}</dd></div></dl><a href={`https://www.camara.leg.br/deputados/${deputy.id}`} target="_blank" rel="noreferrer">Perfil completo na fonte <ArrowUpRight size={12} /></a></div>}
  </>;
}
