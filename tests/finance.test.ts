import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { createArchiveReader } from "../src/lib/expense-archive";
import { getExpenseDocuments as getExpenses, summarizeExpenses } from "../src/lib/expenses";
import { fiscalRowSchema, getStateFinance, parseStateAccounts } from "../src/lib/treasury";
import { parsePeriod } from "../src/lib/finance";
import fixture from "./fixtures/finance.json";
afterEach(() => vi.unstubAllGlobals());
describe("Finanças estaduais", () => {
  const rows = fixture.report.items.map(row => fiscalRowSchema.parse(row));
  const functions = fixture.functions.items.map(row => fiscalRowSchema.parse(row));
  it("usa os totais realizados e pagos da amostra oficial, sem somar subtotais", () => {
    const result = parseStateAccounts(rows, functions);
    expect(result.revenue).toBe(35246500549.88);
    expect(result.transfers).toBe(13551789125.56);
    expect(result.unionTransfers).toBe(11655725150.48);
    expect(result.unionTransfers).not.toBe(result.transfers);
    expect(result.paid).toBe(31872636970.72);
    expect(result.breakdown.some(row => row.name === "Educação")).toBe(true);
    expect(result.breakdown.some(row => row.name === "Ação Legislativa")).toBe(false);
  });
  it("preserva ausência como null e não como zero", () => {
    expect(parseStateAccounts([], [])).toMatchObject({ revenue: null, transfers: null, paid: null, breakdown: [] });
  });
  it("recusa conta duplicada em vez de dobrar o total", () => {
    const total = rows.find(row => row.cod_conta === "TotalReceitas" && row.coluna === "Até o Bimestre (c)")!;
    expect(() => parseStateAccounts([...rows, total], [])).toThrow("mais de um valor");
  });
  it("não aceita relatório de outra UF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.report))));
    await expect(getStateFinance("SP", 2026, 8)).rejects.toThrow("não corresponde");
  });
  it("recua para um bimestre anterior quando o relatório ainda não foi publicado", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [], hasMore: false }))).mockResolvedValueOnce(new Response(JSON.stringify(fixture.report))).mockResolvedValueOnce(new Response(JSON.stringify(fixture.functions)));
    vi.stubGlobal("fetch", fetcher);
    const date = new Date("2027-01-15T12:00:00Z"); vi.useFakeTimers(); vi.setSystemTime(date);
    try { expect((await getStateFinance("CE", 2026, 10)).period).toBe(4); } finally { vi.useRealTimers(); }
  });
});
describe("Despesas parlamentares e arquivo oficial", () => {
  function parseArchive(bytes?: Uint8Array) {
    const reader = createArchiveReader(2026);
    const content = bytes || zipSync({ "Ano-2026.json": strToU8(JSON.stringify({ dados: fixture.archiveRows })) });
    for (let i = 0; i < content.length; i += 8192) reader.push(content.subarray(i, i + 8192));
    reader.push(new Uint8Array(), true); return reader.result();
  }
  it("lê o formato anual real e associa pelo idDeputado, sem expor CPF", () => {
    const records = parseArchive().get(204549)!;
    expect(records).toHaveLength(2);
    expect(records[0].nomeFornecedor).toBe(fixture.archiveRows[0].fornecedor);
    expect(records[0]).not.toHaveProperty("cpf");
  });
  it("não fornece um arquivo incompleto como resultado válido", () => { const reader = createArchiveReader(2026); expect(() => reader.result()).toThrow("incompleto"); });
  it("recorre ao arquivo oficial quando a API está vazia e identifica a fonte", async () => {
    const zip = zipSync({ "Ano-2026.json": strToU8(JSON.stringify({ dados: fixture.archiveRows })) });
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ dados: [], links: [] }))).mockResolvedValueOnce(new Response(zip));
    vi.stubGlobal("fetch", fetcher);
    const result = await getExpenses("204549", 2026, 3);
    expect(result.origin).toBe("archive");
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.source).toBe("https://www.camara.leg.br/cotas/Ano-2026.json.zip");
  });
  it("não confunde um período sem registros com gasto zero", () => { expect(summarizeExpenses([]).total).toBeNull(); });
  it("soma centavos e preserva estornos", () => {
    const item = parseArchive().get(204549)![0];
    expect(summarizeExpenses([{ ...item, valorLiquido: .1 }, { ...item, valorLiquido: .2 }, { ...item, valorLiquido: -.1 }]).total).toBe(.2);
  });
  it("não divulga total parcial quando a página seguinte falha e o arquivo também falha", async () => {
    const item = parseArchive().get(204549)![0];
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ dados: [{ ...item, ano: 2025 }], links: [{ rel: "next", href: "https://dadosabertos.camara.leg.br/api/v2/deputados/204549/despesas?pagina=2" }] }))).mockResolvedValue(new Response("indisponível", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(getExpenses("204549", 2025)).rejects.toThrow("Nenhum total parcial");
  });
  it("recusa parâmetros de período inválidos", () => { expect(() => parsePeriod("2026", "13")).toThrow("Período inválido"); expect(() => parsePeriod("2025", "1")).toThrow("somente dados de 2026"); expect(parsePeriod(null, "1")).toEqual({ year: 2026, month: 1 }); });
  it.skipIf(!process.env.CMI_ARCHIVE_PATH)("valida o arquivo anual completo baixado para integração local", () => {
    const bytes = readFileSync(process.env.CMI_ARCHIVE_PATH!);
    expect(parseArchive(bytes).get(204549)!.length).toBeGreaterThan(2);
  }, 30000);
});
