import { z } from "zod";
import { getState } from "./states";
import { brazilDate } from "./finance";

export const TREASURY_API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";
export const TREASURY_DOCS = "https://apidatalake.tesouro.gov.br/docs/siconfi/";
export const fiscalRowSchema = z.object({
  exercicio: z.number(), periodo: z.number(), cod_ibge: z.number(), uf: z.string(),
  instituicao: z.string(), anexo: z.string(), esfera: z.string(), rotulo: z.string(),
  coluna: z.string(), cod_conta: z.string(), conta: z.string(), valor: z.number().finite(),
});
export type FiscalRow = z.infer<typeof fiscalRowSchema>;
const normal = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const functionNames = ["Legislativa", "Judiciária", "Essencial à Justiça", "Administração", "Defesa Nacional", "Segurança Pública", "Relações Exteriores", "Assistência Social", "Previdência Social", "Saúde", "Trabalho", "Educação", "Cultura", "Direitos da Cidadania", "Urbanismo", "Habitação", "Saneamento", "Gestão Ambiental", "Ciência e Tecnologia", "Agricultura", "Organização Agrária", "Indústria", "Comércio e Serviços", "Comunicações", "Energia", "Transporte", "Desporto e Lazer", "Encargos Especiais"];
export function parseStateAccounts(rows: FiscalRow[], functions: FiscalRow[]) {
  const one = (code: string, column: (column: string) => boolean) => {
    const matches = rows.filter(row => row.cod_conta === code && row.rotulo === "Padrão" && column(normal(row.coluna)));
    if (matches.length > 1) throw new Error("O Tesouro retornou mais de um valor para a mesma conta. Total não publicado.");
    return matches[0]?.valor ?? null;
  };
  const accumulated = (column: string) => column === "ate o bimestre (c)";
  const currentTransfers = one("TransferenciasCorrentes", accumulated);
  const capitalTransfers = one("TransferenciasDeCapital", accumulated);
  const unionCurrent = one("TransferenciasCorrentesDaUniaoEDeSuasEntidades", accumulated);
  const unionCapital = one("TransferenciasDeCapitalDaUniaoEDeSuasEntidades", accumulated);
  const breakdown = functionNames.flatMap(name => {
    const matches = functions.filter(row => normal(row.conta) === normal(name) && row.rotulo === "Total das Despesas Exceto Intra-Orçamentárias" && normal(row.coluna) === "despesas liquidadas ate o bimestre (d)");
    if (matches.length > 1) throw new Error("O Tesouro retornou funções duplicadas. Detalhamento não publicado.");
    return matches.length ? [{ name, value: matches[0].valor }] : [];
  }).sort((a, b) => b.value - a.value);
  return {
    unionTransfers: unionCurrent === null || unionCapital === null ? null : (Math.round(unionCurrent * 100) + Math.round(unionCapital * 100)) / 100,
    unionCurrent, unionCapital,
    revenue: one("TotalReceitas", accumulated),
    transfers: currentTransfers === null || capitalTransfers === null ? null : (Math.round(currentTransfers * 100) + Math.round(capitalTransfers * 100)) / 100,
    paid: one("TotalDespesas", column => column === "despesas pagas ate o bimestre (j)"),
    liquidated: one("TotalDespesas", column => column === "despesas liquidadas ate o bimestre (h)"),
    breakdown,
  };
}
async function getReport(uf: string, year: number, period: number, annex: string, deadline: number) {
  const state = getState(uf)!;
  const query = new URLSearchParams({ an_exercicio: String(year), nr_periodo: String(period), co_tipo_demonstrativo: "RREO", no_anexo: `RREO-Anexo ${annex}`, co_esfera: "E", id_ente: state.code });
  const source = `${TREASURY_API}?${query}`;
  const rows: FiscalRow[] = [];
  for (let page = 0; page < 5; page++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("Tempo de consulta ao Tesouro excedido. Tente novamente.");
    let response;
    try { response = await fetch(`${source}&offset=${page * 5000}&limit=5000`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(Math.min(15000, remaining)), next: { revalidate: 3600 } }); }
    catch { throw new Error("O Tesouro não respondeu a tempo. Tente novamente."); }
    if (!response.ok) throw new Error("O Tesouro está indisponível para esta consulta.");
    const data = z.object({ items: z.array(fiscalRowSchema), hasMore: z.boolean() }).safeParse(await response.json());
    if (!data.success) throw new Error("O formato do relatório mudou na fonte oficial.");
    if (data.data.items.some(row => row.cod_ibge !== Number(state.code) || row.uf !== state.uf || row.exercicio !== year || row.periodo !== period || row.esfera !== "E" || row.anexo !== `RREO-Anexo ${annex}`)) throw new Error("O relatório não corresponde ao estado e período solicitados.");
    rows.push(...data.data.items);
    if (!data.data.hasMore) return { rows, source };
  }
  throw new Error("O relatório está incompleto. Nenhum total foi calculado.");
}
export async function getStateFinance(uf: string, year: number, month?: number) {
  const state = getState(uf);
  if (!state) throw new Error("Estado inválido.");
  const current = brazilDate();
  const lastMonth = year === current.year ? current.month - 1 : 12;
  const maxPeriod = Math.floor(Math.min(month || 12, lastMonth) / 2);
  const deadline = Date.now() + 45000;
  // Procura o relatório mais recente já encerrado, sem avançar além do mês escolhido.
  for (let period = maxPeriod; period >= 1; period--) {
    const report = await getReport(uf, year, period, "01", deadline);
    if (!report.rows.length) continue;
    let functions: FiscalRow[] = [], functionSource: string | null = null, breakdownError: string | null = null;
    try { const detail = await getReport(uf, year, period, "02", deadline); functions = detail.rows; functionSource = detail.source; }
    catch { breakdownError = "O detalhamento por função não está disponível. Os totais vêm do Anexo 01."; }
    return { ...parseStateAccounts(report.rows, functions), year, period, endMonth: period * 2, uf: state.uf, institution: report.rows[0].instituicao, source: report.source, functionSource, breakdownError, fetchedAt: new Date().toISOString() };
  }
  return { unionTransfers: null, unionCurrent: null, unionCapital: null, revenue: null, transfers: null, paid: null, liquidated: null, breakdown: [], year, period: null, endMonth: null, uf: state.uf, institution: null, source: TREASURY_DOCS, functionSource: null, breakdownError: null, fetchedAt: new Date().toISOString() };
}
export type StateFinance = Awaited<ReturnType<typeof getStateFinance>>;
