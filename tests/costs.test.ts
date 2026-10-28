import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { composeIdentifiedCost, parseCabinetExpenditure, parseDeputyPayroll, parseDeputyBenefits, parseDeputyStaff, parseHousingPayments } from "../src/lib/parliament-costs";
import { parseSenateExpenses, parseSenatePayroll } from "../src/lib/senate-finance";
import { selectionWindow, sumPublished } from "../src/lib/official-source";
import { economicRanking } from "../src/lib/economic-rankings";
import fixture from "./fixtures/senate-finance.json";
describe("Custo identificado, com componentes reais", () => {
  it("lê remuneração bruta e após descontos da folha parlamentar, sem somar cabeçalhos", () => {
    const html = readFileSync(new URL("./fixtures/deputy-payroll.html", import.meta.url), "utf8");
    expect(parseDeputyPayroll(html, 2026, 9)).toMatchObject({ gross: 46366.19, net: 29152.79, sheets: 1 });
    expect(parseDeputyPayroll(html, 2026, 10).gross).toBeNull();
    expect(parseDeputyPayroll(html.replace("PARLAMENTAR", "SERVIDOR"), 2026, 9).gross).toBeNull();
  });
  it("detalha 13º e estornos, soma folhas suplementares e recusa folha incompleta",()=>{
    const html=readFileSync(new URL("./fixtures/deputy-payroll.html",import.meta.url),"utf8");
    const withThirteenth=html.replace(/(Gratificação Natalina<\/td>\s*<td[^>]*>)0,00/,"$123.000,00");
    const parsed=parseDeputyPayroll(withThirteenth,2026,9);
    expect(parsed.gross).toBe(69366.19);expect(parsed.breakdown.find(row=>row.key==="thirteenth")?.value).toBe(23000);
    const reversal=html.replace(/(Outras Remunerações Eventuais[^<]*<\/td>\s*<td[^>]*>)0,00/,"$1-3.219,87");
    expect(parseDeputyPayroll(reversal,2026,9).gross).toBe(43146.32);
    expect(parseDeputyPayroll(withThirteenth+html.replace("FOLHA NORMAL","FOLHA SUPLEMENTAR"),2026,9)).toMatchObject({gross:115732.38,sheets:2});
    expect(()=>parseDeputyPayroll(html.replace("Gratificação Natalina","Campo removido"),2026,9)).toThrow("incompleta");
  });
  it("expõe apenas links de folha que vieram da relação oficial de assessores",()=>{
    const row=(href:string)=>`<tr><td>ASSESSOR EXEMPLO</td><td>SECRETÁRIO PARLAMENTAR</td><td>SP08</td><td>Desde 27/02/2026</td><td><a href="${href}">Remuneração</a></td></tr>`;
    const rows=parseDeputyStaff(`<table><tbody>${row("/transparencia/recursos-humanos/remuneracao/ABC123")}${row("https://example.com/fake")}</tbody></table>`);
    expect(rows[0].payrollSource).toBe("https://www.camara.leg.br/transparencia/recursos-humanos/remuneracao/ABC123");expect(rows[1].payrollSource).toBeNull();
  });
  it("usa verba de gabinete gasta e não inventa meses não publicados", () => {
    const html = readFileSync(new URL("./fixtures/cabinet-expenditure.html", import.meta.url), "utf8"), rows = parseCabinetExpenditure(html);
    expect(rows.get(7)).toBe(122008.17); expect(rows.has(9)).toBe(false);
    expect(sumPublished([rows.get(7)!, rows.get(9) ?? null])).toBeNull();
  });
  it("distingue equipe atual, vínculos anuais e uso do imóvel funcional", () => {
    const data=parseDeputyBenefits(readFileSync(new URL("./fixtures/deputy-benefits.html",import.meta.url),"utf8"));
    expect(data.staff).toEqual({inYear:18,activeNow:15});expect(data.functionalApartment).toBe("Faz uso desde 28/02/2019");expect(data.housingStatus).toContain("Não recebe");
    const housing=readFileSync(new URL("./fixtures/deputy-housing.html",import.meta.url),"utf8");
    const rows=parseHousingPayments(housing,2026);expect(rows.get(3)).toBe(4250);expect([...rows.values()].reduce((a,b)=>a+b,0)).toBe(21250);expect(rows.has(9)).toBe(false);
    expect(()=>parseHousingPayments(housing,2025)).toThrow("exercício");
  });
  it("soma componentes conhecidos e identifica custo parcial, preservando estornos", () => {
    const make = (value: number | null, key: string) => ({ key, label: key, value, source: "https://www.camara.leg.br", note: "Amostra de aritmética" });
    expect(composeIdentifiedCost([make(100.11, "salario"), make(-10.01, "cota"), make(null, "estrutura")], 30)).toMatchObject({ identifiedTotal: 90.1, identifiedDaily: 3, complete: false, knownComponents: 2 });
    expect(composeIdentifiedCost([make(null, "salario")], 30).identifiedTotal).toBeNull();
  });
  it("considera apenas dias do mês escolhido e não avança um mês futuro", () => {
    const now = new Date("2026-10-27T23:00:00Z");
    expect(selectionWindow(2026, 9, now)).toMatchObject({ months: [9], days: 30 });
    expect(selectionWindow(2026, 10, now).days).toBe(27);
    expect(selectionWindow(2026, 11, now)).toMatchObject({ months: [], days: 0 });
    expect(selectionWindow(2024, 2, now).days).toBe(29);
  });
});
describe("Senado: despesas e folha por competência", () => {
  it("valida identificadores CEAPS e não retém CPF/CNPJ", () => {
    const result = parseSenateExpenses(fixture.expenses, 2026);
    expect(result[0]).toMatchObject({ codSenador: 5982, valorReembolsado: 7000 });
    expect(JSON.stringify(result)).not.toMatch(/cpf|cnpj/i);
    expect(() => parseSenateExpenses([...fixture.expenses, fixture.expenses[0]], 2026)).toThrow("duplicados");
    expect(() => parseSenateExpenses(fixture.expenses, 2025)).toThrow("exercício");
  });
  it("preserva despesas cuja categoria não foi informada pela fonte", () => {
    const rows = parseSenateExpenses([{ ...fixture.expenses[0], tipoDespesa: null }], 2026);
    expect(rows[0].tipoDespesa).toBe("Categoria não informada pelo Senado");
    expect(rows[0].valorReembolsado).toBe(fixture.expenses[0].valorReembolsado);
  });
  it.skipIf(!process.env.CMI_SENATE_PATH)("valida o arquivo CEAPS completo sem descartar documentos sem categoria", () => {
    const raw = JSON.parse(readFileSync(process.env.CMI_SENATE_PATH!, "utf8"));
    const rows = parseSenateExpenses(raw, 2026);
    expect(rows).toHaveLength(raw.length);
    expect(rows.filter(row => row.codSenador === 5386).reduce((sum, row) => sum + Math.round(row.valorReembolsado * 100), 0) / 100).toBe(190314.11);
  });
  it("soma folhas suplementares e preserva separação entre bruto e líquido", () => {
    const rows = parseSenatePayroll(fixture.payroll, 2026, 9);
    const person = rows.get("ALESSANDRO VIEIRA")!;
    expect(person.identities.size).toBe(1); expect(person.gross).toBeGreaterThan(0); expect(person.net).toBeLessThan(person.gross);
    expect(() => parseSenatePayroll(fixture.payroll, 2026, 10)).toThrow("competência");
  });
});
describe("Indicadores internacionais com cobertura explícita", () => {
  it("distingue juros projetados de indicador de consumo em PPC", () => {
    const interest = economicRanking("interest"), purchasing = economicRanking("purchasing");
    expect(interest).toMatchObject({ coverage: 40, period: "16/09/2026", brazil: { rank: 1, value: 8.45 } });
    expect(purchasing).toMatchObject({ coverage: 124, period: "2025", brazil: { rank: 62, name: "Brasil" } });
    expect(purchasing.records.every(row => row.value > 0)).toBe(true);
    expect(() => economicRanking("unknown")).toThrow("inválido");
  });
});
