import gdp from "../data/state-gdp.json";
import { getStateFinance } from "./treasury";
import { mapLimited } from "./official-source";
import { states } from "./states";
export function stateGdp(uf: string) {
  const state = states.find(row => row.uf === uf);
  const row = gdp.records.find(row => row.code === state?.code);
  return row ? { ...row, year: gdp.year, source: gdp.source, dataSource: gdp.dataSource } : null;
}
export function stateGdpRanking() {
  const records = gdp.records.map(row => ({ ...row, uf: states.find(state => state.code === row.code)!.uf })).sort((a,b) => b.value - a.value || a.uf.localeCompare(b.uf));
  return { kind: "gdp" as const, year: gdp.year, records: records.map(row => ({ ...row, rank: 1 + records.filter(other => other.value > row.value).length })), source: gdp.source, dataSource: gdp.dataSource, note: "PIB anual a preços correntes: valor dos bens e serviços finais produzidos no estado. Não é arrecadação do governo. Último ano publicado no IBGE: 2023. O PIB não determina sozinho o volume de repasses federais." };
}
export function rankUnionTransfers(reports: { uf: string; year: number; period: number | null; endMonth: number | null; unionTransfers: number | null; source: string }[]) {
  if (reports.length !== 27 || new Set(reports.map(row => row.uf)).size !== 27 || states.some(state => !reports.some(row => row.uf === state.uf)) || reports.some(row => row.unionTransfers === null || row.period === null || row.year !== 2026) || new Set(reports.map(row => row.period)).size !== 1) throw new Error("Os 27 estados precisam ter repasses publicados para o mesmo bimestre de 2026. Ranking indisponível até completar a comparação.");
  const sorted = reports.map(row => ({ uf: row.uf, name: states.find(state => state.uf === row.uf)!.name, value: row.unionTransfers!, source: row.source })).sort((a,b) => b.value - a.value || a.uf.localeCompare(b.uf));
  return { kind: "union" as const, year: 2026, endMonth: reports[0].endMonth, period: reports[0].period, records: sorted.map(row => ({ ...row, rank: 1 + sorted.filter(other => other.value > row.value).length })), source: "https://apidatalake.tesouro.gov.br/docs/siconfi/", note: "Repasses correntes e de capital da União e de suas entidades recebidos pelos governos estaduais, conforme o RREO. Não inclui automaticamente repasses diretos a prefeituras ou empresas. Não é saldo entre tributos pagos no território e recursos devolvidos." };
}
export async function unionTransferRanking(year: number, month?: number) {
  const reports = await mapLimited([...states], 4, state => getStateFinance(state.uf, year, month));
  return rankUnionTransfers(reports);
}
