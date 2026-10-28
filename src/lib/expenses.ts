import { z } from "zod";
import { CAMARA_API, CamaraError, getDeputy } from "./camara";
import { comparativePerson, getCotaComparative } from "./cota-comparative";

export const expenseSchema = z.object({
  ano: z.number().int(), mes: z.number().int().min(1).max(12),
  codDocumento: z.number().int().nullish(), tipoDespesa: z.string(),
  nomeFornecedor: z.string(), tipoDocumento: z.string().nullish(),
  dataDocumento: z.string().nullish(), numDocumento: z.string().nullish(),
  valorDocumento: z.number().finite(), valorGlosa: z.number().finite().nullish(), valorLiquido: z.number().finite(),
  urlDocumento: z.string().nullish(), numRessarcimento: z.string().nullish(),
});
export type Expense = z.infer<typeof expenseSchema>;
export function summarizeExpenses(records: Expense[]) {
  // Somar em centavos evita acumular erros de ponto flutuante. Valores negativos (estornos) são preservados.
  const total = records.reduce((sum, item) => sum + Math.round(item.valorLiquido * 100), 0) / 100;
  const categories = new Map<string, number>();
  for (const item of records) categories.set(item.tipoDespesa, (categories.get(item.tipoDespesa) || 0) + Math.round(item.valorLiquido * 100));
  return { total: records.length ? total : null, categories: [...categories].map(([name, cents]) => ({ name, value: cents / 100 })).sort((a, b) => b.value - a.value) };
}
export type ExpenseResult = { records: Expense[]; total: number | null; categories: { name: string; value: number }[]; source: string; year: number; month: number | null; complete: boolean; fetchedAt: string; origin: "api" | "archive"; totalSource?: string; recordsComplete?: boolean; note?: string; publishedAt: string | null };
async function getApiExpenses(id: string, year: number, month?: number): Promise<ExpenseResult> {
  if (!/^[1-9]\d{0,8}$/.test(id)) throw new CamaraError("Parlamentar inválido.", 400);
  const base = new URLSearchParams({ ano: String(year), itens: "100", ordem: "ASC", ordenarPor: "codDocumento" });
  if (month) base.set("mes", String(month));
  const records: Expense[] = [];
  const started = Date.now();
  const schema = z.object({ dados: z.array(expenseSchema), links: z.array(z.object({ rel: z.string(), href: z.string() })) });
  // Total só é exposto quando todas as páginas foram obtidas. Uma falha invalida a consulta inteira.
  for (let page = 1; page <= 40; page++) {
    const remaining = 18000 - (Date.now() - started);
    if (remaining <= 0) throw new CamaraError("Tempo limite da API de despesas excedido.");
    const query = new URLSearchParams(base); query.set("pagina", String(page));
    const source = `${CAMARA_API}/deputados/${id}/despesas?${query}`;
    let response;
    try { response = await fetch(source, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(Math.min(12000, remaining)), next: { revalidate: 1800 } }); }
    catch { throw new CamaraError("A Câmara não respondeu à consulta de despesas. Tente novamente."); }
    if (!response.ok) throw new CamaraError("As despesas estão indisponíveis na Câmara neste momento.");
    let raw: unknown;
    try { raw = await response.json(); } catch { throw new CamaraError("A resposta de despesas não pôde ser lida."); }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new CamaraError("A estrutura das despesas mudou na fonte oficial.");
    if (parsed.data.dados.some(item => item.ano !== year || (month !== undefined && item.mes !== month))) throw new CamaraError("A fonte retornou despesas fora do período solicitado.");
    records.push(...parsed.data.dados);
    if (!parsed.data.links.some(link => link.rel === "next")) {
      return { records: records.sort((a, b) => (b.dataDocumento || "").localeCompare(a.dataDocumento || "")), ...summarizeExpenses(records), source: `${CAMARA_API}/deputados/${id}/despesas?${base}`, year, month: month ?? null, complete: true, fetchedAt: new Date().toISOString(), origin: "api", publishedAt: null };
    }
  }
  throw new CamaraError("A consulta excedeu o limite seguro. Escolha um mês para obter um total completo.");
}
export async function getExpenseDocuments(id: string, year: number, month?: number): Promise<ExpenseResult> {
  if (!/^[1-9]\d{0,8}$/.test(id)) throw new CamaraError("Parlamentar inválido.", 400);
  try { const result = await getApiExpenses(id, year, month); if (result.records.length) return result; } catch { /* Usa a segunda fonte oficial, nunca mistura fontes na mesma soma. */ }
  try {
    const { getArchiveExpenses } = await import("./expense-archive");
    const archive = await getArchiveExpenses(id, year, month);
    const records = archive.records.toSorted((a, b) => (b.dataDocumento || "").localeCompare(a.dataDocumento || ""));
    return { records, ...summarizeExpenses(records), source: archive.source, year, month: month ?? null, complete: true, fetchedAt: new Date().toISOString(), origin: "archive", publishedAt: archive.publishedAt };
  } catch { throw new CamaraError("Não foi possível confirmar as despesas nas fontes da Câmara. Nenhum total parcial foi exibido."); }
}

// O comparativo inclui passagens SIGEPA, ausentes no arquivo JSON documental.
export async function getExpenses(id: string, year: number, month?: number): Promise<ExpenseResult> {
  const [profile, comparative, documents] = await Promise.all([getDeputy(id), getCotaComparative(year,month), getExpenseDocuments(id,year,month)]);
  const row=comparativePerson(comparative.index,profile.ultimoStatus.nome,profile.ultimoStatus.siglaUf);
  if (!row && documents.records.length) throw new CamaraError("O nome do deputado não foi confirmado no comparativo completo da Câmara. Total não publicado.");
  return { ...documents, total: row?.total ?? null, categories: row?.categories || [], totalSource: comparative.source, recordsComplete: false, note: "Total e categorias do comparativo oficial, incluindo passagens SIGEPA. Os documentos abaixo são um subconjunto da base JSON/API; não representam todo o total. As duas fontes não são somadas." };
}
