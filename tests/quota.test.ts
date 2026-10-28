import { afterEach, describe, expect, it, vi } from "vitest";
import { compareQuota, getQuotaComparison, quotaMonthly, quotaPeriodDays } from "../src/lib/quota";
import { getDeputy } from "../src/lib/camara";
import { getExpenses } from "../src/lib/expenses";
vi.mock("../src/lib/camara", () => ({ getDeputy: vi.fn() }));
vi.mock("../src/lib/expenses", () => ({ getExpenses: vi.fn() }));
vi.mock("../src/lib/cota-comparative", () => ({ comparativePeriod: vi.fn(async (_name, _uf, _year, months: number[]) => ({ total: [{ m:1,v:100.11 },{m:2,v:-10.01},{m:3,v:200}].filter(row => months.includes(row.m)).reduce((sum,row)=>sum+Math.round(row.v*100),0)/100 })) }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("Referência de cota sem presumir saldo oficial", () => {
  it("usa dias corridos do período encerrado ou até hoje, respeitando ano bissexto e Brasília", () => {
    expect(quotaPeriodDays(2026, 10, new Date("2026-10-27T12:00:00Z"))).toBe(300);
    expect(quotaPeriodDays(2026, 10, new Date("2026-10-28T01:00:00Z"))).toBe(300);
    expect(quotaPeriodDays(2024, 2, new Date("2026-10-27T12:00:00Z"))).toBe(60);
    expect(quotaPeriodDays(2026, 2, new Date("2026-10-27T12:00:00Z"))).toBe(59);
  });
  it("cobre as 27 UFs e preserva centavos e margens negativas", () => {
    expect(Object.keys(quotaMonthly)).toHaveLength(27);
    expect(compareQuota(200.11, 100.03, 2)).toMatchObject({ reference: 200.06, referenceMargin: -0.05, officialBalance: null });
    expect(compareQuota(null, 100, 2).referenceMargin).toBeNull();
    expect(compareQuota(0, null, 2).usedPercent).toBeNull();
  });
  it("compara gasto acumulado no período e preserva estornos nos grupos", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
    vi.mocked(getDeputy).mockResolvedValue({ ultimoStatus: { siglaUf: "CE" } } as Awaited<ReturnType<typeof getDeputy>>);
    vi.mocked(getExpenses).mockImplementation(async (_id,_year,month) => {
      const records = [
        { mes: 1, valorLiquido: 100.11, tipoDespesa: "Transporte", nomeFornecedor: "Fornecedor A" },
        { mes: 2, valorLiquido: -10.01, tipoDespesa: "Transporte", nomeFornecedor: "Fornecedor A" },
        { mes: 3, valorLiquido: 200, tipoDespesa: "Comunicação", nomeFornecedor: "Fornecedor B" },
      ].filter(row => month === undefined || row.mes === month);
      return { records, total: records.length ? records.reduce((sum,row)=>sum+Math.round(row.valorLiquido*100),0)/100:null, categories: records.map(row=>({name:row.tipoDespesa,value:row.valorLiquido})), source: "https://www.camara.leg.br/cotas/Ano-2026.json.zip" } as Awaited<ReturnType<typeof getExpenses>>;
    });
    const result = await getQuotaComparison("204549", 2026, 2);
    expect(getExpenses).toHaveBeenCalledWith("204549", 2026, 2);
    expect(result).toMatchObject({ spent: 90.10, endMonth: 2, reference: 109758.68, officialBalance: null, selectedSpent: -10.01, selectedReference:54879.34, periodDays: 28, categories: [{ name: "Transporte", value: -10.01 }] });
    const annual=await getQuotaComparison("204549",2026);expect(annual.endMonth).toBe(10);expect(annual.selectedReference).toBe(548793.4);expect(annual.selectedUsedPercent).toBeCloseTo(annual.selectedSpent!/548793.4*100);
    expect(await getQuotaComparison("204549", 2026, 12)).toMatchObject({ endMonth: 10, selectedSpent: null, periodDays: 0, selectedDailySpent: null });
    expect((await getQuotaComparison("204549", 2025)).reference).toBeNull();
  });
});
