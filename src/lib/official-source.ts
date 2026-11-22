import { brazilDate } from "./finance";

export const normalizePublicName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toUpperCase();
export function publicMoney(value: string | number) {
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("Valor oficial inválido."); return value; }
  const text = value.trim().replace(/^R\$\s*/, "");
  if (!/^-?\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(text)) throw new Error("Formato monetário incompatível na fonte oficial.");
  return Math.round(Number(text.replaceAll(".", "").replace(",", ".")) * 100) / 100;
}
export async function officialText(url: string, maxBytes = 16000000) {
  const response = await fetch(url, { headers: { Accept: "application/json,text/html,text/csv;q=0.9,*/*;q=0.8" }, cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.body) throw new Error(`Fonte oficial indisponível (HTTP ${response.status}).`);
  const reader = response.body.getReader(), decoder = new TextDecoder(/charset=([^;\s]+)/i.exec(response.headers.get("content-type") || "")?.[1] || "utf-8");
  let bytes = 0, result = "";
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > maxBytes) throw new Error("A fonte excedeu o tamanho seguro; nenhum total parcial foi usado."); result += decoder.decode(chunk.value, { stream: true }); } return result + decoder.decode(); }
  catch (error) { await reader.cancel(); throw error; }
}
export function selectionWindow(year: number, month?: number, now = new Date()) {
  const current = brazilDate(now), day = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", day: "numeric" }).format(now));
  const endMonth = year === current.year ? current.month : 12;
  const months = month ? month <= endMonth ? [month] : [] : Array.from({ length: endMonth }, (_, i) => i + 1);
  const days = months.reduce((sum, m) => sum + (year === current.year && m === current.month ? day : new Date(Date.UTC(year, m, 0)).getUTCDate()), 0);
  return { year, month: month ?? null, months, days, label: month ? `${String(month).padStart(2, "0")}/${year}` : `Janeiro a ${String(endMonth).padStart(2, "0")}/${year}` };
}
export function sumPublished(values: (number | null)[]) {
  return values.length && values.every(value => value !== null) ? values.reduce<number>((sum, value) => sum + Math.round(value! * 100), 0) / 100 : null;
}
export async function mapLimited<T, R>(items: T[], concurrency: number, run: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (next < items.length) { const index = next++; results[index] = await run(items[index]); } }));
  return results;
}
