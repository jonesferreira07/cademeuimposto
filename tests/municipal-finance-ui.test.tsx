import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MunicipalFinanceContent } from "../src/components/municipal-finance-panel";
import { parseMunicipalFunctions, parseMunicipalTotals, type MunicipalFinance } from "../src/lib/municipal-finance";
import { fiscalRowSchema } from "../src/lib/treasury";
import fixture from "./fixtures/municipal-finance.json";
const data: MunicipalFinance = { ...parseMunicipalTotals(fixture.report.items.map(row => fiscalRowSchema.parse(row))), ...parseMunicipalFunctions(fixture.functions.items.map(row => fiscalRowSchema.parse(row))), id: "2111300", name: "São Luís", uf: "MA", year: 2026, reportType: "RREO", requestedMonth: 9, period: 4, endMonth: 8, institution: "Prefeitura Municipal de São Luís - MA", source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo", functionSource: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo", breakdownError: null, fetchedAt: "2026-10-30T12:00:00Z" };
describe("Apresentação das contas municipais", () => {
  it("distingue despesas pagas, liquidadas e empenhadas, com período efetivo e fonte", () => {
    const html = renderToStaticMarkup(<MunicipalFinanceContent data={data} tab="summary" />);
    expect(html).toContain("Quanto o município gastou");
    expect(html).toContain("Janeiro a agosto de 2026");
    expect(html).toContain("3.486.140.928,05");
    expect(html).toContain("Não some essas etapas");
    expect(html).toContain("empresas, contratos, obras");
    expect(html).toContain("Impostômetro no topo continua com o recorte estadual");
  });
  it("mostra áreas com valores completos, sem atribuir gastos agregados a empresas ou pessoas", () => {
    const html = renderToStaticMarkup(<MunicipalFinanceContent data={data} tab="uses" />);
    expect(html).toContain("Educação"); expect(html).toContain("Saúde");
    expect(html).toContain("Podem ainda não ter sido pagas");
    expect(html).toContain("do total liquidado por função");
    expect(html).toContain("Anexo 02");
  });
  it("não exibe zero ou percentuais quando não existe informação suficiente", () => {
    const html = renderToStaticMarkup(<MunicipalFinanceContent data={{ ...data, ...parseMunicipalTotals([]), ...parseMunicipalFunctions([]), period: null, endMonth: null }} tab="summary" />);
    expect(html).toContain("não significa que o município não arrecadou ou não gastou");
    expect(html).not.toContain("R$");
    const incomplete = renderToStaticMarkup(<MunicipalFinanceContent data={{ ...data, reconciled: false }} tab="uses" />);
    expect(incomplete).not.toContain("do total liquidado por função");
  });
});
