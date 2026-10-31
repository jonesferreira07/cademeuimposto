"use client";
import { balanceAppearance, type MunicipalBalanceRow } from "@/lib/municipal-balance";
import { money, months } from "@/lib/finance";
export function MunicipalBalanceLegend({ year, period, loading, processed, total, rows, error, retry }: { year: number; period: number | null; loading: boolean; processed: number; total: number; rows: Record<string, MunicipalBalanceRow>; error: string | null; retry: () => void }) {
  const confirmed = Object.values(rows).filter(row => row.status === "ok" && balanceAppearance(row.revenue, row.paid).tone !== "neutral").length;
  const failures = Object.values(rows).filter(row => row.status === "error").length;
  return <div className="municipal-balance-legend">
    <div className="municipal-balance-key" aria-label="Legenda da comparação financeira"><span><i className="balance-dot-green" />Pago ≤ receita</span><span><i className="balance-dot-red" />Pago &gt; receita</span><span><i className="balance-dot-neutral" />Sem comparação</span></div>
    <div className="municipal-balance-progress" role="status">{loading ? `Consultando cores: ${processed}${total ? `/${total}` : ""} municípios` : `${confirmed}/${total} municípios com comparação confirmada`}{(error || failures > 0) && <button onClick={retry}>Tentar novamente</button>}</div>
    <details className="municipal-color-method"><summary>{period ? `Jan–${months[period * 2 - 1].toLowerCase()}/${year} · entenda as cores` : period === 0 ? `Sem bimestre encerrado · ${year}` : "Critério das cores"}</summary><p>Receita realizada e despesa paga do Anexo 01 do RREO/Siconfi, no mesmo bimestre de {year}. Inclui a variante simplificada. Verde: pago menor ou igual à receita. Vermelho: pago maior que a receita. A cor fica mais intensa quanto maior a diferença em relação à receita, até 50%; acima disso, mantém o tom máximo.</p><p>Cinza: consulta pendente, falha, dados insuficientes ou valores que não permitem a comparação. Não recuamos para bimestres diferentes entre cidades. Despesas empenhadas, liquidadas e restos a pagar não integram este indicador; a cor não é o resultado fiscal oficial nem uma avaliação da qualidade dos serviços.</p>{error && <p>{error}</p>}{failures > 0 && <p>{failures} municípios tiveram falha na consulta. Nenhum foi considerado gasto zero.</p>}<a href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noreferrer">Tesouro · metodologia e fonte ↗</a></details>
  </div>;
}
export function MunicipalBalanceInfo({ row, loading, district = false }: { row?: MunicipalBalanceRow; loading: boolean; district?: boolean }) {
  if (district) return <span>Distrito estadual · não é comparação municipal.</span>;
  if (!row) return <span>{loading ? "Consultando receita e despesa paga…" : "Consulta não confirmada para este município."}</span>;
  if (row.status !== "ok") return <span>{row.status === "error" ? "Consulta indisponível. Sem classificação financeira." : "Receita ou despesa não disponível neste bimestre."}</span>;
  const appearance = balanceAppearance(row.revenue, row.paid);
  return <><span>{appearance.label}</span><span>Receita {money(row.revenue, true)} · Pago {money(row.paid, true)}</span>{appearance.difference !== null && <span>Receita menos pago: {money(appearance.difference, true)}</span>}{row.source && <a href={row.source} target="_blank" rel="noreferrer">Ver relatório oficial ↗</a>}</>;
}
