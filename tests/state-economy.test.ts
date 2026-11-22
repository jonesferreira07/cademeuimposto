import { describe, expect, it } from "vitest";
import { stateGdpRanking, stateGdp, rankUnionTransfers } from "../src/lib/state-economy";
import { states } from "../src/lib/states";
import type { StateFinance } from "../src/lib/treasury";
describe("Produção e transferências são indicadores distintos", () => {
  it("inclui as 27 UFs e converte os mil reais do IBGE corretamente", () => {
    const result = stateGdpRanking();
    expect(result.year).toBe(2023); expect(result.records).toHaveLength(27);
    expect(result.records[0]).toMatchObject({ uf: "SP", rank: 1, value: 3444814033000 });
    expect(stateGdp("SP")?.value).toBe(3444814033000);
    expect(result.records.every((row,i,all) => !i || row.value <= all[i-1].value)).toBe(true);
  });
  it("publica repasses somente com 27 UFs e período idêntico, sem inferir pela posição do PIB", () => {
    const reports = states.map((state,i) => ({ uf: state.uf, year: 2026, period: 4, endMonth: 8, unionTransfers: (i+1)*100, source: "https://apidatalake.tesouro.gov.br" } as StateFinance));
    expect(rankUnionTransfers(reports).records[0].uf).toBe("TO");
    expect(() => rankUnionTransfers(reports.slice(1))).toThrow("27 estados");
    expect(() => rankUnionTransfers(reports.map((row,i) => i ? row : { ...row, period: 3 }))).toThrow("mesmo bimestre");
    expect(() => rankUnionTransfers(reports.map((row,i) => i ? row : { ...row, unionTransfers: null }))).toThrow();
  });
});
