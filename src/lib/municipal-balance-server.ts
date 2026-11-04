import index from "@/data/municipal-index.json";
import { getState } from "./states";
import { brazilDate } from "./finance";
import { REPORTING_YEAR } from "./reporting-period";
import { getMunicipalBalanceReport, MunicipalFinanceError } from "./municipal-finance";
import type { MunicipalBalancePage, MunicipalBalanceRow } from "./municipal-balance";
export const BALANCE_PAGE_SIZE = 24;
export async function getMunicipalBalancePage(uf: string, year: number, month?: number, offset = 0, requestedPeriod?: number, signal?: AbortSignal): Promise<MunicipalBalancePage> {
  const state = getState(uf);
  if (!state || state.uf === "DF") throw new MunicipalFinanceError("Estado inválido para comparação municipal.", 400);
  if (year !== REPORTING_YEAR || month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) throw new MunicipalFinanceError("Período de comparação inválido.", 400);
  const current = brazilDate();
  const lastMonth = year < current.year ? 12 : year === current.year ? current.month - 1 : 0;
  const maxPeriod = Math.floor(Math.min(month || 12, lastMonth) / 2);
  let period = requestedPeriod ?? maxPeriod;
  if (!Number.isInteger(period) || period < 0 || period > maxPeriod) throw new MunicipalFinanceError("Bimestre de comparação inválido.", 400);
  const cities = index.filter(city => city.uf === state.uf);
  if (!Number.isInteger(offset) || offset < 0 || offset % BALANCE_PAGE_SIZE || offset >= cities.length) throw new MunicipalFinanceError("Página de comparação inválida.", 400);
  const chunk = cities.slice(offset, offset + BALANCE_PAGE_SIZE);
  const deadline = Date.now() + 42000;
  for (;;) {
    const records: MunicipalBalanceRow[] = new Array(chunk.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(6, chunk.length) }, async () => {
      while (cursor < chunk.length && !signal?.aborted) {
        const position = cursor++, city = chunk[position];
        if (!period) { records[position] = { id: city.id, name: city.name, revenue: null, paid: null, status: "missing", source: null }; continue; }
        try { records[position] = await getMunicipalBalanceReport(city.id, year, period, deadline, signal); }
        catch { records[position] = { id: city.id, name: city.name, revenue: null, paid: null, status: "error", source: null }; }
      }
    }));
    if (signal?.aborted) throw new MunicipalFinanceError("Consulta interrompida.", 499);
    // A virada do calendário não significa que o RREO já foi publicado.
    // Só a consulta inicial escolhe o corte; as demais páginas fixam este mesmo bimestre.
    // Falhas da fonte não comprovam ausência de dados e nunca autorizam recuar.
    if (offset === 0 && requestedPeriod === undefined && period > 1 && records.every(row => row.status === "missing")) {
      if (Date.now() >= deadline) throw new MunicipalFinanceError("O Tesouro não respondeu a tempo. Tente novamente.");
      period--;
      continue;
    }
    return { uf: state.uf, year, period, endMonth: period * 2, offset, total: cities.length, nextOffset: offset + chunk.length < cities.length ? offset + chunk.length : null, records };
  }
}
