export type MunicipalBalanceRow = {
  id: string; name: string; revenue: number | null; paid: number | null;
  status: "ok" | "missing" | "error"; source: string | null;
};
export type MunicipalBalancePage = {
  uf: string; year: number; period: number; endMonth: number; offset: number;
  total: number; nextOffset: number | null; records: MunicipalBalanceRow[];
};
export function balanceAppearance(revenue: number | null | undefined, paid: number | null | undefined) {
  const unknown = { tone: "neutral" as const, color: "#64748b", label: "Sem comparação confirmada", difference: null as number | null, percent: null as number | null };
  if (revenue == null || paid == null || !Number.isFinite(revenue) || !Number.isFinite(paid) || revenue < 0 || paid < 0) return unknown;
  const r = Math.round(revenue * 100), p = Math.round(paid * 100);
  if (!Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return unknown;
  const difference = (r - p) / 100;
  const ratio = r > 0 ? Math.abs(r - p) / r : p > 0 ? 1 : 0;
  const red = p > r;
  const color = blend(red ? "#f3aaa5" : "#83d8ad", red ? "#b51f39" : "#087747", Math.min(1, ratio / .5));
  return { tone: red ? "red" as const : "green" as const, color, label: red ? "Despesa paga acima da receita" : "Despesa paga menor ou igual à receita", difference, percent: r > 0 ? (p - r) / r * 100 : null };
}
function blend(start: string, end: string, fraction: number) {
  const channels = [1,3,5].map(i => Math.round(parseInt(start.slice(i,i+2),16) + (parseInt(end.slice(i,i+2),16) - parseInt(start.slice(i,i+2),16)) * fraction).toString(16).padStart(2,"0"));
  return "#" + channels.join("");
}
