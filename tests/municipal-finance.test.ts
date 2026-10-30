import { afterEach, describe, expect, it, vi } from "vitest";
import { getMunicipalFinance, municipalIdentity, parseMunicipalFunctions, parseMunicipalTotals } from "../src/lib/municipal-finance";
import { fiscalRowSchema } from "../src/lib/treasury";
import fixture from "./fixtures/municipal-finance.json";
import simplified from "./fixtures/municipal-finance-simplified.json";
const totals = fixture.report.items.map(row => fiscalRowSchema.parse(row));
const functions = fixture.functions.items.map(row => fiscalRowSchema.parse(row));
const response = (data: unknown) => new Response(JSON.stringify(data));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Contas municipais oficiais", () => {
  it("identifica municípios pelo IBGE e rejeita códigos, localidades distritais e entes inexistentes", () => {
    expect(municipalIdentity("2111300")).toMatchObject({ name: "São Luís", uf: "MA" });
    expect(() => municipalIdentity("09210")).toThrow("inválido");
    expect(() => municipalIdentity("2199999")).toThrow("não encontrado");
    expect(() => municipalIdentity("5300108")).toThrow("distrital");
    expect(() => municipalIdentity("2605459")).toThrow("distrital");
  });
  it("preserva valores do RREO de São Luís sem somar totais e subtotais", () => {
    const result = parseMunicipalTotals(totals);
    expect(result.revenue).toBe(4390633018.2);
    expect(result.paid).toBe(3486140928.05);
    expect(result.liquidated).toBe(3603556403.2);
    expect(result.committed).toBe(5565164257.1);
    expect(result.unionTransfers).toBe(1422326034.51);
    expect(result.transfers).not.toBe(result.unionTransfers);
    const detail = parseMunicipalFunctions(functions);
    expect(detail.functionTotal).toBe(3521005621.69);
    expect(detail.breakdown.some(row => row.name === "Saúde")).toBe(true);
    expect(detail.breakdown.some(row => row.name === "Educação")).toBe(true);
    expect(detail.breakdown.some(row => row.name === "Ação Legislativa")).toBe(false);
    expect(detail.reconciled).toBe(true);
  });
  it("não transforma ausência em zero e recusa conta duplicada", () => {
    expect(parseMunicipalTotals([])).toMatchObject({ paid: null, revenue: null, unionTransfers: null, committed: null });
    const total = totals.find(row => row.cod_conta === "TotalReceitas")!;
    expect(() => parseMunicipalTotals([...totals, total])).toThrow("mais de um valor");
    const health = functions.find(row => row.conta === "Saúde")!;
    expect(() => parseMunicipalFunctions([...functions, health])).toThrow("duplicadas");
    expect(parseMunicipalFunctions(functions.filter(row => row.conta !== "Saúde")).reconciled).toBe(false);
  });
  it("respeita o filtro, usa o mesmo bimestre nos anexos e não recebe dados de outra cidade", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
    const fetcher = vi.fn().mockResolvedValueOnce(response(fixture.report)).mockResolvedValueOnce(response(fixture.functions));
    vi.stubGlobal("fetch", fetcher);
    const result = await getMunicipalFinance("2111300", 2026, 9);
    expect(result).toMatchObject({ id: "2111300", period: 4, endMonth: 8, requestedMonth: 9 });
    for (const call of fetcher.mock.calls) {
      const url = new URL(String(call[0]));
      expect(url.searchParams.get("co_esfera")).toBe("M");
      expect(url.searchParams.get("id_ente")).toBe("2111300");
      expect(url.searchParams.get("nr_periodo")).toBe("4");
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(fixture.report)));
    await expect(getMunicipalFinance("2304400", 2026, 8)).rejects.toThrow("não corresponde");
  });
  it("não aceita dados de outro exercício, esfera, anexo ou periodicidade", async () => {
    for (const mismatch of [{ exercicio: 2025 }, { esfera: "E" }, { anexo: "RREO-Anexo 02" }, { periodicidade: "S" }, { periodo: 3 }]) {
      const other = { ...fixture.report, items: fixture.report.items.map(row => ({ ...row, ...mismatch })) };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(other)));
      await expect(getMunicipalFinance("2111300", 2026, 8)).rejects.toThrow();
    }
  });
  it("recua apenas para relatórios anteriores do ano e preserva totais quando o detalhamento falha", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2027-01-15T12:00:00Z"));
    const fetcher = vi.fn().mockResolvedValueOnce(response({ items: [], hasMore: false })).mockResolvedValueOnce(response({ items: [], hasMore: false })).mockResolvedValueOnce(response(fixture.report)).mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    const result = await getMunicipalFinance("2111300", 2026, 10);
    expect(result.period).toBe(4);
    expect(result.paid).toBe(3486140928.05);
    expect(result.breakdown).toEqual([]);
    expect(result.breakdownError).toContain("não pôde ser confirmado");
  });
  it("não chama a fonte para janeiro sem bimestre encerrado nem esconde erro da fonte como zero", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await getMunicipalFinance("2111300", 2026, 1)).toMatchObject({ period: null, paid: null });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response("erro", { status: 503 }));
    await expect(getMunicipalFinance("2111300", 2026, 8)).rejects.toThrow("indisponível");
    await expect(getMunicipalFinance("2111300", 2025, 8)).rejects.toThrow("inválido");
  });
  it("pagina pelo número de linhas recebido quando o servidor limita a página", async () => {
    const count = Math.floor(fixture.report.items.length / 2);
    const fetcher = vi.fn().mockResolvedValueOnce(response({ items: fixture.report.items.slice(0, count), hasMore: true })).mockResolvedValueOnce(response({ items: fixture.report.items.slice(count), hasMore: false })).mockResolvedValueOnce(response(fixture.functions));
    vi.stubGlobal("fetch", fetcher);
    const result = await getMunicipalFinance("2111300", 2026, 8);
    expect(result.paid).toBe(3486140928.05);
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get("offset")).toBe(String(count));
  });
  it("encontra municípios no RREO Simplificado antes de recuar para outro bimestre", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
    const fetcher = vi.fn().mockResolvedValueOnce(response({ items: [], hasMore: false })).mockResolvedValueOnce(response(simplified.report)).mockResolvedValueOnce(response(simplified.functions));
    vi.stubGlobal("fetch", fetcher);
    const result = await getMunicipalFinance("2101103", 2026, 9);
    expect(result).toMatchObject({ name: "Axixá", period: 4, reportType: "RREO Simplificado" });
    expect(result.paid).toBeGreaterThan(0);
    expect(result.breakdown.some(row => row.name === "Saúde")).toBe(true);
    for (const call of fetcher.mock.calls.slice(1)) {
      const url = new URL(String(call[0]));
      expect(url.searchParams.get("co_tipo_demonstrativo")).toBe("RREO Simplificado");
      expect(url.searchParams.get("nr_periodo")).toBe("4");
    }
  });
  it("não calcula total com páginas faltantes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => response({ ...fixture.report, hasMore: true })));
    await expect(getMunicipalFinance("2111300", 2026, 8)).rejects.toThrow("incompleto");
  });
});
