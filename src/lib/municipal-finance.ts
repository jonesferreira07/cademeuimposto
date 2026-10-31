import { z } from "zod";
import index from "@/data/municipal-index.json";
import { brazilDate } from "./finance";
import { REPORTING_YEAR } from "./reporting-period";
import { fiscalRowSchema, parseStateAccounts, TREASURY_API, TREASURY_DOCS, type FiscalRow } from "./treasury";

type ReportType = "RREO" | "RREO Simplificado";
const registry = new Map(index.map(city => [city.id, city]));
const normal = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export class MunicipalFinanceError extends Error { constructor(message: string, public status = 502) { super(message); } }
export function municipalIdentity(id: string) {
  if (!/^\d{7}$/.test(id)) throw new MunicipalFinanceError("Código municipal inválido.", 400);
  if (["5300108", "2605459"].includes(id)) throw new MunicipalFinanceError("Esta localidade tem regime distrital. Consulte as contas do Distrito Federal ou de Pernambuco.", 422);
  const city = registry.get(id);
  if (!city) throw new MunicipalFinanceError("Município não encontrado na lista oficial do IBGE.", 404);
  return city;
}
function single(rows: FiscalRow[], code: string, column: string, label = "Padrão", account?: string) {
  const matches = rows.filter(row => row.cod_conta === code && normal(row.coluna) === normal(column) && normal(row.rotulo) === normal(label) && (!account || row.conta === account));
  if (matches.length > 1) throw new MunicipalFinanceError("A fonte retornou valores duplicados para a mesma conta. O valor não foi calculado.");
  return matches[0]?.valor ?? null;
}
export function parseMunicipalTotals(rows: FiscalRow[]) {
  return { ...parseStateAccounts(rows, []), committed: single(rows, "TotalDespesas", "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)") };
}
export function parseMunicipalFunctions(rows: FiscalRow[]) {
  const breakdown = parseStateAccounts([], rows).breakdown;
  const functionTotal = single(rows, "RREO2TotalDespesas", "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)", "Total das Despesas Exceto Intra-Orçamentárias", "DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)");
  const sum = breakdown.reduce((total, row) => total + Math.round(row.value * 100), 0);
  const reconciled = functionTotal !== null && Math.abs(sum - Math.round(functionTotal * 100)) <= 1;
  return { breakdown, functionTotal, reconciled };
}
async function municipalReport(id: string, year: number, period: number, annex: string, deadline: number, reportType: ReportType = "RREO", signal?: AbortSignal) {
  const city = municipalIdentity(id);
  const params = new URLSearchParams({ an_exercicio: String(year), nr_periodo: String(period), co_tipo_demonstrativo: reportType, no_anexo: `RREO-Anexo ${annex}`, co_esfera: "M", id_ente: id });
  const source = `${TREASURY_API}?${params}`, rows: FiscalRow[] = [];
  let offset = 0;
  for (let page = 0; page < 5; page++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new MunicipalFinanceError("O Tesouro não respondeu a tempo. Tente novamente.");
    let response: Response;
    try { response = await fetch(`${source}&offset=${offset}&limit=5000`, { headers: { Accept: "application/json" }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(Math.min(15000, remaining))]) : AbortSignal.timeout(Math.min(15000, remaining)), next: { revalidate: 3600 } }); }
    catch { throw new MunicipalFinanceError("O Tesouro não respondeu a tempo. Tente novamente."); }
    if (!response.ok) throw new MunicipalFinanceError("A consulta municipal ao Tesouro está temporariamente indisponível.");
    const parsed = z.object({ items: z.array(fiscalRowSchema.extend({ demonstrativo: z.enum(["RREO", "RREO Simplificado"]), periodicidade: z.literal("B") })), hasMore: z.boolean() }).safeParse(await response.json());
    if (!parsed.success) throw new MunicipalFinanceError("O formato do relatório municipal mudou na fonte oficial.");
    if (parsed.data.items.some(row => row.demonstrativo !== reportType || row.cod_ibge !== Number(id) || row.uf !== city.uf || row.esfera !== "M" || row.exercicio !== year || row.periodo !== period || row.anexo !== `RREO-Anexo ${annex}`)) throw new MunicipalFinanceError("O relatório não corresponde ao município e período solicitados.");
    rows.push(...parsed.data.items);
    if (!parsed.data.hasMore) return { source, rows, reportType };
    if (!parsed.data.items.length) throw new MunicipalFinanceError("O relatório municipal está incompleto. Nenhum total foi publicado.");
    offset += parsed.data.items.length;
  }
  throw new MunicipalFinanceError("O relatório municipal está incompleto. Nenhum total foi publicado.");
}
export async function getMunicipalFinance(id: string, year: number, month?: number) {
  const city = municipalIdentity(id);
  if (year !== REPORTING_YEAR || month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) throw new MunicipalFinanceError("Período inválido. Esta versão apresenta somente dados de 2026.", 400);
  const current = brazilDate();
  const lastClosedMonth = year < current.year ? 12 : year === current.year ? current.month - 1 : 0;
  const maxPeriod = Math.floor(Math.min(month || 12, lastClosedMonth) / 2);
  const deadline = Date.now() + 45000;
  const empty = { ...parseMunicipalTotals([]), ...parseMunicipalFunctions([]), ...city, year, requestedMonth: month ?? null, period: null as number | null, endMonth: null as number | null, institution: null as string | null, reportType: null as ReportType | null, source: TREASURY_DOCS, functionSource: null as string | null, breakdownError: null as string | null, fetchedAt: new Date().toISOString() };
  for (let period = maxPeriod; period >= 1; period--) {
    let report = await municipalReport(id, year, period, "01", deadline);
    if (!report.rows.length) report = await municipalReport(id, year, period, "01", deadline, "RREO Simplificado");
    if (!report.rows.length) continue;
    const totals = parseMunicipalTotals(report.rows);
    let detail = parseMunicipalFunctions([]), functionSource: string | null = null, breakdownError: string | null = null;
    try {
      const functions = await municipalReport(id, year, period, "02", deadline, report.reportType);
      functionSource = functions.source;
      detail = parseMunicipalFunctions(functions.rows);
      if (!detail.breakdown.length) breakdownError = "O município não tem detalhamento por área disponível neste bimestre na base consultada.";
    } catch { breakdownError = "O detalhamento por área não pôde ser confirmado para este bimestre. Os totais abaixo vêm do Anexo 01."; }
    return { ...empty, ...totals, ...detail, period, endMonth: period * 2, institution: report.rows[0].instituicao, reportType: report.reportType, source: report.source, functionSource, breakdownError, fetchedAt: new Date().toISOString() };
  }
  return empty;
}
export type MunicipalFinance = Awaited<ReturnType<typeof getMunicipalFinance>>;

// Consulta exata para o mapa: não recua para outro bimestre nem busca o Anexo 02.
export async function getMunicipalBalanceReport(id: string, year: number, period: number, deadline: number, signal?: AbortSignal) {
  const city = municipalIdentity(id);
  if (year !== REPORTING_YEAR || !Number.isInteger(period) || period < 1 || period > 6) throw new MunicipalFinanceError("Período de comparação inválido.", 400);
  let report = await municipalReport(id, year, period, "01", deadline, "RREO", signal);
  if (!report.rows.length) report = await municipalReport(id, year, period, "01", deadline, "RREO Simplificado", signal);
  const totals = parseMunicipalTotals(report.rows);
  return { id: city.id, name: city.name, revenue: totals.revenue, paid: totals.paid, source: report.source, status: totals.revenue !== null && totals.paid !== null ? "ok" as const : "missing" as const };
}
