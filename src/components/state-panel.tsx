"use client";
import { FederalDestinationsPanel } from "./federal-destinations";
import { useEffect, useState } from "react";
import { ArrowUpRight, Landmark } from "lucide-react";
import { getState } from "@/lib/states";
import { fiscalDate, money, months } from "@/lib/finance";
import gdp from "@/data/state-gdp.json";
import type { StateFinance } from "@/lib/treasury";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";

export function StatePanel({ uf, year, month }: { uf: string | null; year: number; month: string }) {
  const [tab, setTab] = useState<"summary" | "uses">("summary");
  const [page, setPage] = useState(0);
  const report = useData<StateFinance>(uf ? `/api/financas/${uf}?year=${year}&month=${month}` : null);
  useEffect(() => { setPage(0); }, [uf, year, month]);
  const state = getState(uf || ""); const data = report.data;
  const production = gdp.records.find(row => row.code === state?.code);
  return <aside className="dash-state-panel dash-panel"><div className="panel-heading"><span className="panel-icon"><Landmark size={18} /></span><div><span className="dash-eyebrow">{uf?"CONTAS DO ESTADO":"CONTAS DO BRASIL"}</span><h2>{state?.name || "Para onde vai?"}</h2></div>{uf && <span className="uf-tag">{uf}</span>}</div>
    {!uf ? <FederalDestinationsPanel /> : <>
      <div className="panel-tabs" role="tablist" aria-label="Contas estaduais"><button role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>Visão geral</button><button role="tab" aria-selected={tab === "uses"} onClick={() => setTab("uses")}>Onde gastou</button></div>
      {report.loading ? <Loading text="Buscando o relatório do Tesouro…" /> : report.error ? <Failure message={report.error} retry={report.retry} /> : data && <>
        <div className="report-period"><span className="live-dot" />{data.period ? `Janeiro a ${months[data.endMonth! - 1].toLowerCase()} de ${data.year}` : `Sem relatório encerrado em ${year}`}</div>
        {tab === "summary" ? <div className="state-metrics"><Metric label={`Quanto o estado produz · PIB ${gdp.year}`} value={production?.value ?? null} description={`PIB anual de ${gdp.year} · último ano oficial do IBGE`} featured /><Metric label="Recebido da União" value={data.unionTransfers} description="Repasses ao governo estadual · correntes + capital" /><Metric label="Quanto o estado gasta" value={data.paid} description="Despesas efetivamente pagas pelo governo estadual" /><details className="method-details"><summary>Entenda os três valores</summary><p>Repasses da União e de suas entidades, declarados pelo estado no RREO. Não são todos os repasses federais ao território: valores enviados diretamente a prefeituras e entidades têm outros registros.</p><p>PIB é produção de bens e serviços, não dinheiro arrecadado pelo governo. Não estimamos PIB de 2026.</p><p>Receita total do governo no período: {money(data.revenue)}. Inclui outras origens além da União.</p><a href={gdp.source} target="_blank" rel="noreferrer">PIB · IBGE ↗</a></details></div> : <div className="state-functions"><span className="detail-label">DESPESAS LIQUIDADAS POR FUNÇÃO</span><p>Serviços e bens reconhecidos; podem ainda não ter sido pagos. Exclui despesas intraorçamentárias.</p>{data.breakdown.length ? <><div className="function-list">{data.breakdown.slice(page * 4, page * 4 + 4).map(item => <div key={item.name}><div><span>{item.name}</span><strong title={money(item.value)}>{money(item.value, true)}</strong></div><div className="function-track"><span style={{ width: `${data.breakdown[0].value > 0 ? Math.max(0, Math.min(100, item.value / data.breakdown[0].value * 100)) : 0}%` }} /></div></div>)}</div><Pager page={page} total={Math.ceil(data.breakdown.length / 4)} onPage={setPage} /></> : <div className="small-empty">{data.breakdownError || "O detalhamento não foi publicado para este período."}</div>}</div>}
        <p className="context-note">Repasses e gastos são acumulados desde janeiro até o bimestre indicado. O filtro de mês limita esse corte; o PIB tem seu próprio ano de referência.</p><div className="panel-source"><a href={tab === "uses" && data.functionSource ? data.functionSource : data.source} target="_blank" rel="noreferrer">Tesouro · RREO {tab === "uses" ? "Anexo 02" : "Anexo 01"} <ArrowUpRight size={12} /></a><span>{data.period ? `${data.period}º bimestre · consulta ${fiscalDate(data.fetchedAt)}` : "Ausência de informação não significa zero."}</span></div>
      </>}
    </>}
  </aside>;
}
function Metric({ label, value, description, featured = false }: { label: string; value: number | null; description: string; featured?: boolean }) { return <div className={`state-metric ${featured ? "featured" : ""}`}><span>{label}</span><strong title={money(value)}>{value == null ? "Não disponível" : money(value, true)}</strong><small>{description}</small></div>; }
