import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MunicipalBalanceInfo, MunicipalBalanceLegend } from "../src/components/municipal-balance-legend";
const row = { id:"2111300",name:"São Luís",revenue:100,paid:120,status:"ok" as const,source:"https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo" };
describe("Legenda e informação acessível das cores", () => {
  it("explica cores, período comum e que não se trata de resultado fiscal oficial", () => {
    const html = renderToStaticMarkup(<MunicipalBalanceLegend year={2026} period={4} loading={false} processed={1} total={217} rows={{[row.id]:row}} error={null} retry={()=>{}} />);
    expect(html).toContain("Pago ≤ receita");expect(html).toContain("Pago &gt; receita");
    expect(html).toContain("Jan–agosto/2026");expect(html).toContain("1/217");
    expect(html).toContain("não é o resultado fiscal oficial");
  });
  it("mostra valores e diferença sem substituir gastos desconhecidos por zero", () => {
    const html = renderToStaticMarkup(<MunicipalBalanceInfo row={row} loading={false} />);
    expect(html).toContain("Despesa paga acima da receita");expect(html).toMatch(/Pago R\$\s*120/);expect(html).toContain("-R$");
    const missing = renderToStaticMarkup(<MunicipalBalanceInfo row={{...row,status:"missing",revenue:null,paid:null}} loading={false} />);
    expect(missing).not.toContain("R$");expect(missing).toContain("não disponível neste bimestre");
  });
  it("mantém carregamento e falhas explícitos, com opção de tentar novamente", () => {
    const html = renderToStaticMarkup(<MunicipalBalanceLegend year={2026} period={4} loading processed={24} total={217} rows={{[row.id]:{...row,status:"error",paid:null,revenue:null}}} error={null} retry={()=>{}} />);
    expect(html).toContain("24/217");expect(html).toContain("Tentar novamente");expect(html).toContain("Nenhum foi considerado gasto zero");
  });
});
