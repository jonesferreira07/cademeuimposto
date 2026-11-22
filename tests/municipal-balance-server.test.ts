import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import index from "../src/data/municipal-index.json";
vi.mock("../src/lib/municipal-finance", async original => ({ ...await original<typeof import("../src/lib/municipal-finance")>(), getMunicipalBalanceReport: vi.fn() }));
import { getMunicipalBalanceReport } from "../src/lib/municipal-finance";
import { getMunicipalBalancePage } from "../src/lib/municipal-balance-server";
const provider = vi.mocked(getMunicipalBalanceReport);
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
  provider.mockReset(); provider.mockImplementation(async id => ({ id, name: id, revenue: 100, paid: 80, status: "ok", source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo" }));
});
afterEach(() => vi.useRealTimers());
describe("Comparação paginada por UF", () => {
  it("consulta somente os 24 municípios da página e fixa o bimestre em cada chamada", async () => {
    const page = await getMunicipalBalancePage("MA",2026,9);
    expect(page).toMatchObject({ uf: "MA", year: 2026, period: 4, endMonth: 8, offset: 0, nextOffset: 24 });
    expect(page.records.map(row => row.id)).toEqual(index.filter(city => city.uf === "MA").slice(0,24).map(city => city.id));
    for (const call of provider.mock.calls) expect(call.slice(1,3)).toEqual([2026,4]);
  });
  it("não avança além do mês escolhido nem permite misturar períodos", async () => {
    expect((await getMunicipalBalancePage("MA",2026,6,0,3)).period).toBe(3);
    await expect(getMunicipalBalancePage("MA",2026,6,0,4)).rejects.toThrow("Bimestre");
    await expect(getMunicipalBalancePage("MA",2026,12,0,5)).rejects.toThrow("Bimestre");
  });
  it("mantém janeiro sem valores e não faz consultas antes de encerrar o primeiro bimestre", async () => {
    const page = await getMunicipalBalancePage("MA",2026,1);
    expect(page.period).toBe(0); expect(provider).not.toHaveBeenCalled();
    expect(page.records.every(row => row.revenue === null && row.paid === null && row.status === "missing")).toBe(true);
  });
  it("na virada do mês conserva um corte comum com dados, em vez de apagar todas as cores", async () => {
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    provider.mockImplementation(async (id, _year, period) => ({ id, name: id, revenue: period === 5 ? null : 100, paid: period === 5 ? null : 80, status: period === 5 ? "missing" : "ok", source: "https://apidatalake.tesouro.gov.br/" }));
    const first = await getMunicipalBalancePage("MA", 2026);
    expect(first).toMatchObject({ period: 4, endMonth: 8, nextOffset: 24 });
    expect(first.records.every(row => row.status === "ok")).toBe(true);
    expect(provider.mock.calls.map(call => call[2])).toEqual([...Array(24).fill(5), ...Array(24).fill(4)]);
    provider.mockClear();
    const next = await getMunicipalBalancePage("MA", 2026, undefined, first.nextOffset!, first.period);
    expect(next.period).toBe(4);
    expect(provider.mock.calls.every(call => call[2] === 4)).toBe(true);
  });
  it("não troca de bimestre por falha nem quando parte dos relatórios atuais já está disponível", async () => {
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    provider.mockImplementation(async id => ({ id, name: id, revenue: null, paid: null, status: "missing", source: null }));
    provider.mockRejectedValueOnce(new Error("offline"));
    const failed = await getMunicipalBalancePage("MA", 2026);
    expect(failed.period).toBe(5); expect(failed.records[0].status).toBe("error");
    expect(provider).toHaveBeenCalledTimes(24);
    provider.mockClear();
    provider.mockResolvedValueOnce({ id: "2100055", name: "Açailândia", revenue: 100, paid: 80, status: "ok", source: "https://apidatalake.tesouro.gov.br/" });
    const partial = await getMunicipalBalancePage("MA", 2026);
    expect(partial.period).toBe(5);
    expect(provider).toHaveBeenCalledTimes(24);
  });
  it("mantém o bimestre fixado nas outras páginas mesmo quando todas as cidades estão sem valores", async () => {
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    provider.mockImplementation(async id => ({ id, name: id, revenue: null, paid: null, status: "missing", source: null }));
    expect((await getMunicipalBalancePage("MA", 2026, undefined, 24, 5)).period).toBe(5);
    expect((await getMunicipalBalancePage("MA", 2026, undefined, 0, 5)).period).toBe(5);
    expect(provider.mock.calls.every(call => call[2] === 5)).toBe(true);
    expect(provider).toHaveBeenCalledTimes(48);
  });
  it("limita a busca ao mês solicitado e ao próprio exercício sem inventar valores", async () => {
    vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
    provider.mockImplementation(async id => ({ id, name: id, revenue: null, paid: null, status: "missing", source: null }));
    const result = await getMunicipalBalancePage("MA", 2026, 4);
    expect(result.period).toBe(1);
    expect(result.records.every(row => row.status === "missing" && row.revenue === null && row.paid === null)).toBe(true);
    expect(provider.mock.calls.map(call => call[2])).toEqual([...Array(24).fill(2), ...Array(24).fill(1)]);
  });
  it("mantém falha individual neutra sem descartar municípios válidos", async () => {
    provider.mockRejectedValueOnce(new Error("offline"));
    const page = await getMunicipalBalancePage("MA",2026,8);
    expect(page.records[0]).toMatchObject({ status: "error", revenue: null, paid: null });
    expect(page.records.slice(1).every(row => row.status === "ok")).toBe(true);
  });
  it("limita a concorrência e encerra a última página sem duplicar cidades", async () => {
    let running = 0, maximum = 0;
    provider.mockImplementation(async id => { running++; maximum = Math.max(maximum,running); await Promise.resolve(); running--; return { id,name:id,revenue:100,paid:80,status:"ok",source:"https://apidatalake.tesouro.gov.br/" }; });
    await getMunicipalBalancePage("MA",2026,8);
    expect(maximum).toBeLessThanOrEqual(6);
    const last = await getMunicipalBalancePage("MA",2026,8,216);
    expect(last.nextOffset).toBeNull(); expect(last.records).toHaveLength(1);
  });
  it("rejeita estados, páginas e exercícios inválidos e exclui o distrito de Fernando de Noronha", async () => {
    for (const uf of ["DF","ZZ"]) await expect(getMunicipalBalancePage(uf,2026)).rejects.toThrow("Estado");
    for (const offset of [-1,1,99999]) await expect(getMunicipalBalancePage("MA",2026,8,offset)).rejects.toThrow("Página");
    await expect(getMunicipalBalancePage("MA",2025)).rejects.toThrow("Período");
    const count = index.filter(city => city.uf === "PE").length;
    const last = await getMunicipalBalancePage("PE",2026,8,Math.floor((count-1)/24)*24);
    expect(last.records.some(row => row.id === "2605459")).toBe(false);
  });
});
