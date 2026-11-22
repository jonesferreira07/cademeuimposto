"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Landmark } from "lucide-react";
import { fiscalDate, money, months } from "@/lib/finance";
import type { MunicipalFinance } from "@/lib/municipal-finance";
import { Failure, Loading, Pager, useData } from "./dashboard-ui";

export function MunicipalFinancePanel({ id, name, uf, year, month, onState }: { id: string; name: string | null; uf: string | null; year: number; month: string; onState: () => void }) {
  const [tab, setTab] = useState<"summary" | "uses">("summary");
  const district = id === "2605459";
  const report = useData<MunicipalFinance>(district ? null : `/api/financas-municipais/${id}?year=${year}&month=${month}`);
  return <aside className="dash-state-panel dash-panel municipal-finance-panel" aria-label="Contas do município">
    <div className="panel-heading"><span className="panel-icon"><Landmark size={18} /></span><div><span className="dash-eyebrow">{district ? "DISTRITO ESTADUAL" : "CONTAS DO MUNICÍPIO"}</span><h2>{name || report.data?.name || "Município"}</h2></div>{uf && <span className="uf-tag">{uf}</span>}</div>
    <button className="inspector-back" onClick={onState}><ArrowLeft size={12} /> Ver contas do estado</button>
    {district ? <p className="municipal-disclaimer">Fernando de Noronha tem regime distrital. Esta consulta do Tesouro atende a municípios; consulte as contas de Pernambuco e o portal da administração distrital.</p> : <>
      <div className="panel-tabs" role="tablist" aria-label="Contas municipais"><button role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>Quanto gastou</button><button role="tab" aria-selected={tab === "uses"} onClick={() => setTab("uses")}>Por área</button></div>
      {report.loading ? <Loading text="Consultando as contas municipais no Tesouro…" /> : report.error ? <Failure message={report.error} retry={report.retry} /> : report.data && <MunicipalFinanceContent data={report.data} tab={tab} />}
    </>}
  </aside>;
}
export function MunicipalFinanceContent({ data, tab }: { data: MunicipalFinance; tab: "summary" | "uses" }) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [data.id, data.period, tab]);
  return <>
    <div className="report-period"><span className="live-dot" />{data.endMonth ? `Janeiro a ${months[data.endMonth - 1].toLowerCase()} de ${data.year}` : `Sem relatório confirmado em ${data.year}`}</div>
    {!data.period ? <p className="municipal-disclaimer">Não encontramos relatório de 2026 encerrado e disponível até o mês selecionado. Isso não significa que o município não arrecadou ou não gastou. Os dados dependem da entrega ao Tesouro.</p> : <>
      {tab === "summary" ? <div className="state-metrics">
        <MunicipalMetric label="Quanto o município gastou" value={data.paid} description="Despesas pagas no exercício, conforme RREO" featured />
        <MunicipalMetric label="Quanto arrecadou" value={data.revenue} description="Receita realizada total · não só impostos próprios" />
        <MunicipalMetric label="Recebido da União" value={data.unionTransfers} description="Transferências correntes + de capital identificadas" />
        <details className="method-details"><summary>Valores completos e etapas da despesa</summary><p>Pago: {money(data.paid)} — pagamento registrado no relatório do exercício.</p><p>Liquidado: {money(data.liquidated)} — bens e serviços reconhecidos; pode haver parcelas aguardando pagamento.</p><p>Empenhado: {money(data.committed)} — compromisso orçamentário assumido.</p><p>Não some essas etapas: um mesmo gasto pode constar nas três. O RREO do exercício não é o total de todas as saídas de caixa, pois pagamentos de restos a pagar de anos anteriores têm outros demonstrativos.</p><p>Receita realizada: {money(data.revenue)}. Transferências correntes da União: {money(data.unionCurrent)}. Transferências de capital da União: {money(data.unionCapital)}. A ausência de uma parcela impede informar a soma como total confirmado.</p></details>
      </div> : <div className="state-functions municipal-functions"><span className="detail-label">DESTINAÇÃO POR ÁREA</span><p>Despesas liquidadas: o município reconheceu a entrega do bem ou serviço. Podem ainda não ter sido pagas. Excluem operações intraorçamentárias.</p>
        {data.breakdown.length ? <><div className="function-list">{data.breakdown.slice(page * 5, page * 5 + 5).map(item => <div key={item.name}><div><span>{item.name}</span><strong title={money(item.value)}>{money(item.value, true)}</strong></div><div className="function-track" aria-hidden="true"><span style={{ width: `${data.breakdown[0].value > 0 ? Math.max(0, Math.min(100, item.value / data.breakdown[0].value * 100)) : 0}%` }} /></div><small>{money(item.value)}{data.reconciled && data.functionTotal && data.functionTotal > 0 ? ` · ${(item.value / data.functionTotal * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total liquidado por função` : ""}</small></div>)}</div><Pager page={page} total={Math.ceil(data.breakdown.length / 5)} onPage={setPage} />{!data.reconciled && <p className="context-note">As áreas identificadas não puderam ser conciliadas com um total oficial. Não exibimos percentual de cobertura.</p>}</> : <p className="small-empty">{data.breakdownError || "Detalhamento por área ainda não disponível na fonte consultada."}</p>}
        <details className="method-details"><summary>Por que os valores por área diferem do total pago?</summary><p>Aqui mostramos despesas liquidadas do Anexo 02, sem operações intraorçamentárias. No resumo, o total pago vem do Anexo 01 e pode incluir essas operações. As etapas e os escopos diferem; os valores não devem ser somados.</p><p>Encargos Especiais é uma função orçamentária que reúne despesas sem associação direta a um serviço público específico, como obrigações financeiras e transferências. O relatório agregado não detalha cada credor ou contrato.</p></details>
      </div>}
      <p className="context-note">Valores acumulados desde janeiro até o bimestre indicado, limitado pelo mês escolhido. O relatório não é mensal nem atualizado em tempo real.</p>
      <details className="method-details"><summary>O que esta consulta permite acompanhar?</summary><p>Contas declaradas por {data.institution || data.name} ao Siconfi/Tesouro Nacional. São gastos do município, e não despesas pessoais do prefeito ou dos vereadores.</p><p>A classificação por área mostra onde o orçamento foi aplicado. Ela não vincula cada imposto pago pelo cidadão a uma despesa, nem identifica empresas, contratos, obras ou beneficiários individuais. Esse detalhamento exige integração ao portal de transparência municipal.</p><p>Ausência de informação não significa gasto zero. O Impostômetro no topo continua com o recorte estadual; não representa a arrecadação exclusiva desta cidade.</p></details>
    </>}
    <div className="panel-source"><a href={tab === "uses" && data.functionSource ? data.functionSource : data.source} target="_blank" rel="noreferrer">Tesouro · {data.reportType === "RREO Simplificado" ? "RREO simplificado municipal" : "RREO municipal"} {data.period ? `Anexo ${tab === "uses" && data.functionSource ? "02" : "01"}` : "· documentação"} ↗</a><span>{data.period ? `${data.period}º bimestre · consulta ${fiscalDate(data.fetchedAt)}` : "Ausência de informação não significa zero."}</span><span>IBGE {data.id} · {data.uf}</span></div>
  </>;
}
function MunicipalMetric({ label, value, description, featured = false }: { label: string; value: number | null; description: string; featured?: boolean }) {
  return <div className={`state-metric ${featured ? "featured" : ""}`}><span>{label}</span><strong title={money(value)}>{value === null ? "Não disponível" : money(value, true)}</strong><small>{description}</small></div>;
}
