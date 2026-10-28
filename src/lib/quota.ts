import { getDeputy } from "./camara";
import { getExpenses } from "./expenses";
import { brazilDate } from "./finance";
import { comparativePeriod } from "./cota-comparative";
export const QUOTA_SOURCE = "https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar";
export const quotaMonthly: Record<string, number> = { AC:57359.87, AL:53164.36, AM:56151.46, AP:55929.26, BA:50965.29, CE:54879.34, DF:41612.55, ES:49160.15, GO:46979.73, MA:54537.99, MG:47645.91, MS:52707.93, MT:51439.83, PA:54624.17, PB:54402.48, PE:53997.81, PI:53195.84, PR:50807.19, RJ:47267.41, RN:55198.09, RO:56267.90, RR:58474.70, RS:53086.78, SC:51951.42, SE:52248.86, SP:48727.46, TO:51525.80 };
export function compareQuota(spent: number | null, monthly: number | null, months: number) {
  const reference = monthly === null ? null : Math.round(monthly * 100) * months / 100;
  return { spent, reference, referenceMargin: spent === null || reference === null ? null : (Math.round(reference * 100) - Math.round(spent * 100)) / 100, usedPercent: spent === null || reference === null || reference <= 0 ? null : spent / reference * 100, officialBalance: null };
}
export function quotaPeriodDays(year: number, endMonth: number, now = new Date()) {
  const current = brazilDate(now);
  const day = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", day: "numeric" }).format(now));
  const end = year === current.year && endMonth === current.month ? Date.UTC(year, endMonth - 1, day) : Date.UTC(year, endMonth, 0);
  return Math.floor((end - Date.UTC(year, 0, 1)) / 86400000) + 1;
}
export async function getQuotaComparison(id: string, year: number, month?: number) {
  const profile = await getDeputy(id), now = brazilDate();
  const endMonth = year === now.year ? Math.min(month || now.month, now.month) : month || 12;
  const expenses = await getExpenses(id, year, month);
  const accumulated = month === undefined ? { total: expenses.total } : await comparativePeriod(profile.ultimoStatus.nome, profile.ultimoStatus.siglaUf, year, Array.from({ length: endMonth },(_,i)=>i+1));
  const records = expenses.records.filter(row => row.mes <= endMonth);
  const spent = accumulated.total;
  const selected = records;
  const selectedSpent = expenses.total;
  const group = (field: "tipoDespesa" | "nomeFornecedor") => {
    const totals = new Map<string, number>();
    for (const row of selected) { const name = row[field] || "Não informado"; totals.set(name, (totals.get(name) || 0) + Math.round(row.valorLiquido * 100)); }
    return [...totals].map(([name, cents]) => ({ name, value: cents / 100 })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  };
  // A tabela atual não é aplicada retroativamente e não representa ajustes individuais do mandato.
  const monthly = year === 2026 ? quotaMonthly[profile.ultimoStatus.siglaUf] ?? null : null;
  const days = quotaPeriodDays(year, endMonth);
  const periodDays = month === undefined ? days : month > endMonth ? 0 : days - (month === 1 ? 0 : quotaPeriodDays(year, endMonth - 1));
  return { selectedMonth: month ?? null, selectedSpent, periodDays, selectedDailySpent: selectedSpent === null || periodDays <= 0 ? null : Math.round(selectedSpent / periodDays * 100) / 100, ...compareQuota(spent, monthly, endMonth), publishedAt: expenses.publishedAt, fetchedAt: expenses.fetchedAt, days, dailySpent: spent === null ? null : Math.round(spent / days * 100) / 100, categories: expenses.categories, suppliers: group("nomeFornecedor"), monthlyReference: monthly, year, endMonth, uf: profile.ultimoStatus.siglaUf, source: QUOTA_SOURCE, expenseSource: expenses.totalSource || expenses.source, verifiedAt: "2026-10-27", note: "Margem teórica para exercício integral: não é saldo oficial. Pode haver afastamentos, proporcionalidade, ajustes e documentos apresentados em até 90 dias. A cota acumula no mesmo ano, sem passar ao ano seguinte. Percentual menor não demonstra economicidade por si só; é necessário avaliar finalidade, preços e resultados." };
}
export type QuotaResult = Awaited<ReturnType<typeof getQuotaComparison>>;
