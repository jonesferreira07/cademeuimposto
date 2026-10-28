"use client";
import { Info } from "lucide-react";
import { useState } from "react";
import { useData, Loading, Failure, Pager } from "./dashboard-ui";
import { money } from "@/lib/finance";
import type { ParliamentCostResult } from "@/lib/parliament-costs";
import type { getSenateCosts, SenateExpenseResult } from "@/lib/senate-finance";
type Result = Omit<ParliamentCostResult, "benefits"|"payrollMonths"> & { benefits?: ParliamentCostResult["benefits"]; payrollMonths?:ParliamentCostResult["payrollMonths"];resources?: Awaited<ReturnType<typeof getSenateCosts>>["resources"] };
type DailyData = Pick<Result, "identifiedDaily" | "identifiedTotal" | "days" | "period" | "components">;
export function IdentifiedDailyCost({house,data}:{house:"camara"|"senado";data:DailyData}) {
  const included=data.components.filter(item=>item.value!==null);
  const missing=data.components.filter(item=>item.value===null);
  const explanations:Record<string,string>={
    salary:"Remuneração bruta publicada do parlamentar, incluindo 13º e outras verbas remuneratórias identificadas. O líquido não é somado novamente.",
    staff:"Verba de gabinete efetivamente utilizada para salários de assessores, somente nas competências publicadas.",
    quota:house==="camara"?"Cota parlamentar: despesas líquidas identificadas, incluindo pagamentos e reembolsos publicados, sem somar documentos novamente ao total.":"CEAPS: despesas reembolsadas identificadas pelo código do senador no período selecionado.",
    housing:"Auxílio-moradia comprovado na fonte. Complementos já contabilizados na cota não são somados novamente.",
    other:"Outros recursos oficialmente publicados fora da CEAPS. O bloco anual só entra no acumulado anual; não é atribuído a um mês isolado.",
  };
  return <>
    <div className="daily-reflection identified-daily">
      <span>Quanto custa este parlamentar aos cofres públicos por dia?</span>
      <strong>{data.identifiedDaily===null?"Dados insuficientes":`${money(data.identifiedDaily)} / dia`}</strong>
      <b>CUSTO IDENTIFICADO · VALOR PARCIAL</b>
      <details className="daily-info"><summary><Info size={17} aria-hidden="true"/><span>Sobre este indicador parcial</span></summary><p>Exibe apenas o custo público identificado por dia nas fontes consultadas. Não comprova o custo integral de manutenção do parlamentar. Despesas sem informação suficiente ficam fora da soma, sem serem tratadas como zero.</p></details>
      <p>Período selecionado: {data.period.label} · {data.days} dias corridos.</p>
    </div>
    <aside className="daily-transparency" aria-label="Aviso de transparência"><p>⚠️ ATENÇÃO: Este valor não representa o custo total do parlamentar. O cálculo considera apenas despesas identificadas nas fontes oficiais. O custo real tende a ser maior, pois outros gastos com pessoal, encargos, benefícios e estrutura pública ainda não estão integralmente disponíveis ou individualizados por parlamentar.</p></aside>
    <details className="method-details daily-method"><summary>Entenda o cálculo</summary>
      <h4>Como calculamos? · {house==="camara"?"Câmara dos Deputados":"Senado Federal"}</h4>
      <p className="daily-formula">Custo público identificado por dia = Soma das despesas identificadas no período ÷ Número de dias corridos do período.</p>
      <p>{data.identifiedTotal===null?"Soma identificada indisponível":`Soma identificada: ${money(data.identifiedTotal)}`} · {data.days} dias corridos. O divisor considera todo o período selecionado, inclusive quando algumas competências ainda não possuem dados.</p>
      <h4>O que entra na conta nesta consulta</h4>
      {included.length?<ul>{included.map(item=><li key={item.key}><strong>{item.label}:</strong> {explanations[item.key]||item.note}{item.coverageLabel&&<p>{item.coverageLabel}</p>}<a href={item.source} target="_blank" rel="noreferrer">Fonte oficial ↗</a></li>)}</ul>:<p>Nenhum componente tem informação suficiente nesta consulta. Não calculamos gasto zero a partir dessa ausência.</p>}
      <h4>Componentes sem informação suficiente neste período</h4>
      {missing.length?<ul>{missing.map(item=><li key={item.key}><strong>{item.label}:</strong> {item.note}{item.coverageLabel&&<p>{item.coverageLabel}</p>}<a href={item.source} target="_blank" rel="noreferrer">Fonte oficial ↗</a></li>)}</ul>:<p>Mesmo com valores para os componentes consultados, este indicador não comprova cobertura de todas as despesas do mandato.</p>}
      <h4>O que ainda pode estar fora da conta</h4>
      <ul><li>{house==="camara"?"Encargos, 13º, férias e benefícios dos assessores pagos fora da verba de gabinete e não incluídos nos dados consolidados.":"Remuneração, encargos, 13º, férias e benefícios dos assessores sem lotação histórica individual verificável; a equipe atual não comprova o vínculo de cada mês."}</li><li>Custos de prédios, energia elétrica, segurança e manutenção.</li><li>Custos institucionais compartilhados sem rateio individual verificável.</li><li>Demais despesas e benefícios não individualizados ou indisponíveis nas fontes consultadas.</li></ul>
      <p>Competências confirmadas aparecem em cada componente, quando informadas pela fonte. Um acumulado com competências ausentes continua parcial. Ausência de informação não significa gasto zero; valores zero publicados e estornos são preservados.</p>
      <p>Emendas parlamentares não são despesas pessoais nem custos de manutenção do parlamentar e não entram nesta soma. Não somamos despesas duplicadas nem estimamos componentes ausentes.</p>
    </details>
  </>;
}
export function ParliamentCosts({ house, id, year, month }: { house: "camara" | "senado"; id: string | number; year: number; month: string }) {
  const result = useData<Result>(`/api/custos/${house}/${id}?year=${year}&month=${month}`), data = result.data;
  const [staffPage, setStaffPage] = useState(0);
  return result.loading ? <Loading text="Conferindo remuneração, gabinete e despesas nas fontes oficiais…" /> : result.error ? <Failure message={result.error} retry={result.retry} /> : data && <section className="parliament-cost-breakdown">
    <IdentifiedDailyCost house={house} data={data} />
    <div className="expense-total"><span>Total identificado no período selecionado</span><strong>{money(data.identifiedTotal)}</strong><small>{data.note}</small></div>
    {data.benefits && <section className="cabinet-benefits"><h4>Gabinete e moradia</h4><dl>{data.benefits.staff && <><div><dt>Assessores ativos na consulta atual</dt><dd>{data.benefits.staff.activeNow} pessoas</dd></div><div><dt>Pessoas com vínculo no ano</dt><dd>{data.benefits.staff.inYear} · podem ter entrado e saído</dd></div></>}<div><dt>Imóvel funcional · situação atual</dt><dd>{data.benefits.functionalApartment || "Não confirmado nesta consulta"}</dd></div><div><dt>Auxílio-moradia · situação publicada</dt><dd>{data.benefits.housingStatus || "Não confirmado nesta consulta"}</dd></div></dl><p>A equipe e o uso de imóvel refletem a consulta atual, não uma fotografia histórica do mês selecionado. O custo de manutenção do imóvel não é estimado por deputado.</p><a href={data.benefits.source} target="_blank" rel="noreferrer">Gabinete e benefícios · Câmara ↗</a></section>}
    <dl className="cost-components">{data.components.map(item => <div key={item.key}><dt>{item.label}</dt><dd>{item.value === null ? "Não consolidado neste período" : money(item.value)}</dd>{item.coverageLabel&&<small className="component-coverage">{item.coverageLabel}</small>}{item.details&&<ul className="salary-breakdown">{item.details.map(row=><li key={row.key}><span>{row.label}</span><b>{money(row.value)}</b></li>)}</ul>}<details className="method-details"><summary>Fonte e composição</summary><p>{item.note}</p><a href={item.source} target="_blank" rel="noreferrer">Conferir na fonte oficial ↗</a></details></div>)}</dl>
    {!!data.payrollMonths?.length&&<details className="method-details"><summary>Folhas detalhadas conferidas por mês</summary>{data.payrollMonths.map(row=><a className="payroll-month-source" key={row.month} href={row.source} target="_blank" rel="noreferrer">{String(row.month).padStart(2,"0")}/{year} · {row.sheets} {row.sheets===1?"folha":"folhas"} · {money(row.gross)} ↗</a>)}</details>}
    {data.salaryNet !== null && <p className="context-note">Após os descontos informados na folha: {money(data.salaryNet)}. Não é somada novamente ao custo bruto; confira o detalhamento dos descontos na fonte.</p>}
    <details className="method-details"><summary>Assessores e composição da equipe</summary>{data.staff.length ? <><p>Vínculos publicados pela Câmara para o ano consultado. As datas indicam o período de cada vínculo; não são todos necessariamente simultâneos.</p>{data.staff.slice(staffPage * 3, staffPage * 3 + 3).map((person, i) => <div className="linked-record" key={i}><strong>{person.name}</strong><p>{person.role}<br />{person.period}</p>{person.payrollSource&&<a href={`${person.payrollSource}?ano=${year}${month!=="all"?`&mes=${Number(month)}`:""}`} target="_blank" rel="noreferrer">Folha individual · salário, 13º e auxílios ↗</a>}</div>)}<Pager page={staffPage} total={Math.ceil(data.staff.length / 3)} onPage={setStaffPage} /></> : data.resources?.pessoal?.length ? <><p>Quantitativos publicados no bloco de recursos do Senado; não equivalem a um custo de folha nem a uma série mensal.</p>{data.resources.pessoal.map((row, i) => <p key={i}>{row.local}: <strong>{row.quantidade} vínculos</strong></p>)}<p>A folha de salários não informa a lotação histórica de cada competência. Por isso não atribuímos o custo dos assessores por nome aproximado.</p></> : <p>A composição da equipe não foi consolidada nesta consulta.</p>}<a href={data.staffSource} target="_blank" rel="noreferrer">Equipe e gabinete na fonte ↗</a></details>
    {data.resources && <details className="method-details"><summary>Estrutura, benefícios e recursos anuais · {year}</summary><p>Este bloco é anual e não representa apenas o mês selecionado.</p>{data.resources.gastosNaoInclusos?.despesas.map((row, i) => <div className="quota-group" key={i}><span>{row.recurso}</span><strong>{money(row.valor)}</strong></div>)}{data.resources.beneficios?.map((row, i) => <p key={i}>{row.beneficio}: {row.utilizacao}</p>)}<a href={data.resources.source} target="_blank" rel="noreferrer">Recursos utilizados · Senado ↗</a></details>}
  </section>;
}
export function SenateExpenses({ id, year, month }: { id: string; year: number; month: string }) {
  const result = useData<SenateExpenseResult>(`/api/senadores/${id}/despesas?year=${year}&month=${month}`), data = result.data;
  const [page, setPage] = useState(0), [categoryPage, setCategoryPage] = useState(0), [supplierPage, setSupplierPage] = useState(0);
  return result.loading ? <Loading text="Somando os documentos CEAPS do período selecionado…" /> : result.error ? <Failure message={result.error} retry={result.retry} /> : data && <div>
    <div className="expense-total"><span>CEAPS · {month === "all" ? "ano inteiro" : `${month}/${year}`}{month === "all" ? ` · ${year}` : ""}</span><strong>{data.total === null ? "Sem registros no período" : money(data.total)}</strong><small>{data.records.length} documentos · reembolsos líquidos. Sem registros não significa gasto zero.</small></div>
    <details className="method-details"><summary>Como gastou · categorias</summary>{data.categories.slice(categoryPage * 3, categoryPage * 3 + 3).map(row => <div key={row.name} className="quota-group"><span>{row.name}</span><strong>{money(row.value)}</strong></div>)}{data.categories.length > 3 && <Pager page={categoryPage} total={Math.ceil(data.categories.length / 3)} onPage={setCategoryPage} />}</details>
    <details className="method-details"><summary>Com quem gastou · fornecedores</summary>{data.suppliers.slice(supplierPage * 3, supplierPage * 3 + 3).map(row => <div key={row.name} className="quota-group"><span>{row.name}</span><strong>{money(row.value)}</strong></div>)}{data.suppliers.length > 3 && <Pager page={supplierPage} total={Math.ceil(data.suppliers.length / 3)} onPage={setSupplierPage} />}</details>
    {data.records.slice(page, page + 1).map(row => <article className="expense-row" key={row.id}><div className="expense-row-top"><span>{row.data?.split("-").reverse().join("/") || "Data não informada"}</span><strong>{money(row.valorReembolsado)}</strong></div><h4>{row.tipoDespesa}</h4><p>{row.fornecedor}</p><div className="expense-meta"><span>{row.tipoDocumento || "Documento"} {row.documento || "sem número informado"}<br />Competência {row.mes}/{row.ano} · registro {row.id}</span></div></article>)}{!!data.records.length && <Pager page={page} total={data.records.length} onPage={setPage} />}
    <div className="panel-source"><a href={data.source} target="_blank" rel="noreferrer">Senado · despesas CEAPS oficiais ↗</a><span>Data de emissão e competência não são a data do reembolso. Não inclui salário nem assessores. Documentos e comprovantes também podem ser consultados no portal do Senado.</span></div>
  </div>;
}
