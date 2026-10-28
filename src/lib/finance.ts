import { REPORTING_YEAR } from "./reporting-period";
export const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function money(value: number | null | undefined, compact = false) {
  if (value == null) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", ...(compact ? { notation: "compact", maximumFractionDigits: 2 } : {}) }).format(value);
}
export function fiscalDate(value: string | null | undefined) {
  const date = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return date ? `${date[3]}/${date[2]}/${date[1]}` : "Data não informada";
}
export function brazilDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "numeric" }).formatToParts(now);
  return { year: Number(parts.find(p => p.type === "year")!.value), month: Number(parts.find(p => p.type === "month")!.value) };
}
export class PeriodError extends Error {}
export function parsePeriod(year?: string | null, month?: string | null) {
  const y = Number(year || REPORTING_YEAR);
  const m = month && month !== "all" ? Number(month) : undefined;
  if (!Number.isInteger(y) || y !== REPORTING_YEAR || (m !== undefined && (!Number.isInteger(m) || m < 1 || m > 12))) throw new PeriodError("Período inválido. Esta versão apresenta somente dados de 2026.");
  return { year: y, month: m };
}
