import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import { zipSync } from "fflate";
import { amendmentTotals, createAmendmentReader, getAmendments, parsePublicMoney, beneficiaryCompany, unliquidatedAmount } from "../src/lib/amendments";
import { parseCounter, getStateTaxRanking } from "../src/lib/tax-counter";
import { getGlobalTaxRanking } from "../src/lib/rankings";
import { equivalentUnits, comparisonReferences } from "../src/lib/comparisons";
import { states, taxLocation } from "../src/lib/states";
import fixture from "./fixtures/amendments.json";
vi.mock("../src/lib/impostometro-fetch",()=>({impostometroFetch:(url:string)=>fetch(url)}));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function sampleZip() {
  const entries = Object.fromEntries(Object.entries(fixture.files).map(([name, file]) => {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const text = [file.columns.map(quote).join(";"), ...file.rows.map(row => file.columns.map(col => quote((row as Record<string, string>)[col] || "")).join(";"))].join("\r\n");
    return [name, new Uint8Array(Buffer.from(text, "latin1"))];
  }));
  return zipSync(entries);
}
describe("Emendas reais e integridade de autoria", () => {
  it("lê CP1252 em pequenos blocos, preserva finalidade e não retém identificadores pessoais", async () => {
    const parser = createAmendmentReader(2026), bytes = sampleZip();
    for (let i = 0; i < bytes.length; i += 31) parser.push(bytes.subarray(i, i + 31), i + 31 >= bytes.length);
    const result = await parser.result();
    expect(result.amendments[0]).toMatchObject({ code: "202639020001", authorCode: "3902", function: "Saúde", subfunction: "Atenção básica", committed: 25252007, paid: 24252007 });
    expect(result.beneficiaries.get("202639020001")?.[0]).toMatchObject({ name: "FUNDO MUNICIPAL DE SAUDE DE MIRAIMA", cnpj: "11787063000156", period: "202606", amount: 2000000 });
    expect(JSON.stringify([...result.beneficiaries])).not.toMatch(/cpf|codigo_do_favorecido/i);
    expect(amendmentTotals(result.amendments)).toMatchObject({ paid: 24252007, awaitingLiquidation: 1000000 });
  });
  it("exibe CNPJ válido somente de pessoa jurídica, sem promover CPF mascarado a CNPJ", () => {
    expect(beneficiaryCompany({ tipo_favorecido: "Pessoa Jurídica", codigo_do_favorecido: "11.787.063/0001-56", favorecido: "FUNDO MUNICIPAL DE SAUDE DE MIRAIMA" })).toMatchObject({ cnpj: "11787063000156", legalName: "FUNDO MUNICIPAL DE SAUDE DE MIRAIMA" });
    for (const raw of ["***12345678***", "11111111111111", "11787063000155", "123.456.789-00"]) expect(beneficiaryCompany({ tipo_favorecido: "Pessoa Jurídica", codigo_do_favorecido: raw }).cnpj).toBeNull();
    expect(beneficiaryCompany({ tipo_favorecido: "Pessoa Fisica", codigo_do_favorecido: "11787063000156" })).toMatchObject({ cnpj: null, legalName: null });
    expect(unliquidatedAmount(100.11, 10.01)).toBe(90.1);
    expect(unliquidatedAmount(1, 2)).toBeNull(); expect(unliquidatedAmount(null, 0)).toBeNull();
  });
  it("não publica total de arquivo incompleto e não transforma ausência em zero", async () => {
    const parser = createAmendmentReader(2026); parser.push(zipSync({ "outro.csv": new Uint8Array() }), true);
    await expect(parser.result()).rejects.toThrow("incompleta");
    expect(amendmentTotals([]).paid).toBeNull();
  });
  it("preserva centavos e estornos e rejeita moeda incompatível", () => {
    expect(parsePublicMoney("1.234.567,89")).toBe(1234567.89);
    expect(parsePublicMoney("-50,01")).toBe(-50.01);
    expect(() => parsePublicMoney("1234.56")).toThrow();
  });
  it("não consulta nem atribui valores quando o autor não foi verificado", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await getAmendments("999999999", 2026)).toMatchObject({ verified: false, records: [], totals: { paid: null } });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.runIf(!!process.env.CMI_AMENDMENTS_PATH)("confere o arquivo completo oficial, sem somar beneficiários ao orçamento", async () => {
    const parser = createAmendmentReader(2026), bytes = readFileSync(process.env.CMI_AMENDMENTS_PATH!);
    for (let i = 0; i < bytes.length; i += 65536) parser.push(bytes.subarray(i, i + 65536), i + 65536 >= bytes.length);
    const result = await parser.result();
    const rows = result.amendments.filter(row => row.code === "202639020001");
    expect(rows).toHaveLength(1); expect(amendmentTotals(rows)).toMatchObject({ paid: 24252007, awaitingLiquidation: 1000000 });
    expect(result.beneficiaries.get("202639020001")?.find(row => row.name === "FUNDO MUNICIPAL DE SAUDE DE MIRAIMA")?.cnpj).toBe("11787063000156");
    expect(result.amendments.every(row => row.year === 2026 && row.type.startsWith("Emenda Individual"))).toBe(true);
  }, 60000);
});
describe("Contador e comparações com fontes", () => {
  const now = Date.parse("2026-10-27T22:00:00Z");
  const raw = { Valor: 1000, Incremento: 2, Midnight: "2026-10-27T00:00:00.0000000", Data: "2026-10-27T19:00:00.0000000" };
  it("calcula o instante da fonte a partir da meia-noite em Brasília", () => {
    expect(parseCounter(raw, "PI", now)).toMatchObject({ value: 1000 + 19 * 3600 * 2, increment: 2, observedAt: "2026-10-27T22:00:00.000Z", year: 2026 });
  });
  it("recusa projeções antigas, futuras, negativas ou com base de outro dia", () => {
    expect(() => parseCounter(raw, null, now + 300001)).toThrow("recente");
    expect(() => parseCounter(raw, null, now - 60001)).toThrow("recente");
    expect(() => parseCounter({ ...raw, Incremento: -1 }, null, now)).toThrow("formato");
    expect(() => parseCounter({ ...raw, Midnight: "2026-10-26T00:00:00" }, null, now)).toThrow("recente");
  });
  it("recusa ranking estadual parcial se uma das 27 consultas falhar", async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const fetcher = vi.fn(async (url: string) => url.includes("estado=pi") ? new Response("", { status: 503 }) : new Response(JSON.stringify(raw)));
    vi.stubGlobal("fetch", fetcher);
    await expect(getStateTaxRanking()).rejects.toThrow("indisponível");
  });
  it("equivalências arredondam para baixo e usam referências positivas", () => {
    expect(equivalentUnits(200001, 100000)).toBe(2);
    expect(() => equivalentUnits(1, 0)).toThrow();
    expect(comparisonReferences.every(row => row.unitValue > 0 && row.source.startsWith("https://"))).toBe(true);
  });
  it("aplica as preposições solicitadas em todas as UFs", () => {
    expect(taxLocation()).toBe("no Brasil");
    for (const state of states) {
      const prefix = ["RO", "MG", "AL", "SE", "RR", "SP"].includes(state.uf) ? "em" : ["BA", "PB"].includes(state.uf) ? "na" : "no";
      expect(taxLocation(state.uf)).toBe(`${prefix} ${state.name}`);
    }
  });
});
describe("Comparação internacional no mesmo exercício", () => {
  it("exclui agregados e situa Brasil em 27º entre 128 economias em 2024", () => {
    const result = getGlobalTaxRanking();
    expect(result.year).toBe(2024); expect(result.coverage).toBe(128);
    expect(result.brazil).toMatchObject({ code: "BRA", rank: 27, value: 33.67750895 });
    expect(new Set(result.records.map(row => row.code)).size).toBe(128);
    expect(result.records.every(row => /^[A-Z]{3}$/.test(row.code))).toBe(true);
    expect(result.records[0].code).toBe("DNK");
  });
});
