import { load } from "cheerio";
import { officialText, normalizePublicName, publicMoney, mapLimited } from "./official-source";
type Payment = { year: number; month: number; amount: number; source: string; dataFile: string; label: string; name: string; origin: "official" };
export function parseMaranhaoPayroll(html: string, year: number, month: number, name: string) {
  const $ = load(html);
  if (Number($('select[name="ano"] option[selected]').attr("value")) !== year || Number($('select[name="mes"] option[selected]').attr("value")) !== month) throw new Error("A folha do Maranhão não confirmou a competência solicitada.");
  const rows: { amount: number; position: string }[] = [];
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length !== 9 || normalizePublicName($(cells[1]).text()) !== normalizePublicName(name)) return;
    const position = normalizePublicName($(cells[4]).text());
    if (!["GOVERNADOR", "CONSELHEIRO"].includes(position)) throw new Error("Vínculo adicional não validado na folha do governador.");
    rows.push({ amount: publicMoney($(cells[6]).text().trim()), position });
  });
  if (rows.filter(row => row.position === "GOVERNADOR").length !== 1 || rows.length > 2) return null;
  return rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
}
export function parsePiauiPayroll(raw: unknown, year: number, name: string) {
  const data = raw as { count?: number; next?: string | null; results?: { ano: number; nome: string; remuneracao_bruta: string }[] };
  if (data.count !== 1 || data.next !== null || data.results?.length !== 1) return null;
  const row = data.results[0];
  if (row.ano !== year || normalizePublicName(row.nome) !== normalizePublicName(name) || !/^-?\d+(?:\.\d{1,2})?$/.test(row.remuneracao_bruta)) return null;
  const amount = Number(row.remuneracao_bruta); return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}
const cache = new Map<string, { expires: number; promise: Promise<Payment | null> }>();
async function monthly(uf: string, year: number, month: number): Promise<Payment | null> {
  const key = `${uf}-${year}-${month}`, previous = cache.get(key); if (previous && previous.expires > Date.now()) return previous.promise;
  const name = uf === "MA" ? "CARLOS ORLEANS BRANDAO JUNIOR" : "RAFAEL TAJRA FONTELES";
  const source = uf === "MA" ? `https://www.transparencia.ma.gov.br/app/v2/pessoal/remuneracao?ano=${year}&mes=${month}&tipo_busca=nome&nome=${encodeURIComponent(name)}` : `https://api.transparencia.pi.gov.br/api/v2/servidores/${year}/${month}/?nome__exact=${encodeURIComponent(name)}&page_size=10`;
  const promise = officialText(source).then(text => {
    const amount = uf === "MA" ? parseMaranhaoPayroll(text, year, month, name) : parsePiauiPayroll(JSON.parse(text), year, name);
    return amount === null ? null : { year, month, amount, source, dataFile: source, name, origin: "official" as const, label: uf === "MA" ? "Proventos brutos publicados: governadoria e vínculo de conselheiro. Antes dos descontos pessoais; não é apenas o subsídio do cargo." : "Remuneração bruta na API oficial do Piauí. Competência indicada na rota consultada; antes dos descontos pessoais." };
  }).catch(() => { cache.delete(key); return null; });
  if (cache.size >= 24) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 3600000, promise }); return promise;
}
export async function officialGovernorPayments(uf: string, year: number, months: number[], aliases: Set<string>) {
  const expected = uf === "MA" ? "CARLOS ORLEANS BRANDAO JUNIOR" : uf === "PI" ? "RAFAEL TAJRA FONTELES" : null;
  if (!expected || !aliases.has(expected)) return [];
  return (await mapLimited(months, 3, month => monthly(uf, year, month))).filter((row): row is Payment => row !== null);
}
