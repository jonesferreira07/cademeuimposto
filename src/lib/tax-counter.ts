import { impostometroFetch } from "./impostometro-fetch";
import { parseCounter, TAX_SOURCE } from "./tax-counter-schema";
import type { CounterSample } from "./tax-counter-schema";
import { brazilDate } from "./finance";
import { getState } from "./states";
import { REPORTING_YEAR } from "./reporting-period";

export { TAX_SOURCE, parseCounter } from "./tax-counter-schema";
export type { CounterSample } from "./tax-counter-schema";
const counterCache = new Map<string, { expires: number; value: Promise<CounterSample> }>();
export async function getCounter(uf?: string | null) {
  const state = uf ? getState(uf) : undefined;
  if (uf && !state) throw new Error("Estado inválido.");
  const year = REPORTING_YEAR;
  if (brazilDate().year !== REPORTING_YEAR) throw new Error("O contador em tempo real desta versão está limitado a 2026.");
  const path = state ? `/Contador/Estado?estado=${state.uf.toLowerCase()}&ano=${year}` : "/Contador/Brasil";
  const cached = counterCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = loadCounter(path, state?.uf || null).catch(error => { counterCache.delete(path); throw error; });
  counterCache.set(path, { expires: Date.now() + 60000, value });
  return value;
}
async function loadCounter(path: string, uf: string | null) {
  let response;
  try { response = await impostometroFetch(`${TAX_SOURCE}${path}`, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", Referer: `${TAX_SOURCE}/widget/contador/${uf?.toLowerCase() || ""}` }, cache: "no-store", signal: AbortSignal.timeout(12000) }); }
  catch (error) {
    const reason = error instanceof Error ? error : new Error(String(error));
    const cause = reason.cause;
    console.error("[impostometro] Falha de conexão", {
      name: reason.name,
      message: reason.message,
      cause: cause instanceof Error ? {
        message: cause.message,
        code: "code" in cause ? cause.code : undefined
      } : undefined
    });
    throw new Error("Não foi possível consultar a estimativa tributária neste momento.");
  }
  if (!response.ok) throw new Error("O provedor do contador está indisponível.");
  try { return parseCounter(await response.json(), uf); }
  catch (error) { throw new Error(error instanceof Error && !/JSON/.test(error.message) ? error.message : "Resposta do contador inválida."); }
}
export async function getStateTaxRanking() {
  const { states } = await import("./states");
  const samples: CounterSample[] = []; let index = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (index < states.length) { const state = states[index++]; samples.push(await getCounter(state.uf)); } }));
  const asOf = Date.now();
  const ranked = samples.map(sample => { const age = asOf - Date.parse(sample.observedAt); if (age > 300000) throw new Error("Nem todos os estados possuem dados recentes comparáveis."); const state = getState(sample.uf!)!; return { uf: state.uf, name: state.name, value: sample.value + sample.increment * Math.max(0, age) / 1000 }; }).sort((a, b) => b.value - a.value || a.uf.localeCompare(b.uf));
  return { records: ranked.map(item => ({ ...item, rank: 1 + ranked.filter(other => other.value > item.value).length })), asOf: new Date(asOf).toISOString(), year: brazilDate().year, source: TAX_SOURCE, metric: "Estimativa do volume total de tributos das três esferas arrecadados em cada território, alinhada ao mesmo instante. Não mede carga por habitante ou percentual do PIB." };
}
