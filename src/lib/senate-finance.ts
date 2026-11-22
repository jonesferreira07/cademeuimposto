import { z } from "zod";
import { getSenators } from "./senate";
import { officialText, normalizePublicName, publicMoney, selectionWindow, sumPublished, mapLimited } from "./official-source";
import { composeIdentifiedCost, type CostComponent } from "./parliament-costs";

export const SENATE_ADM = "https://adm.senado.gov.br/adm-dadosabertos/api/v1";
const expenseSchema = z.object({ id: z.number().int(), ano: z.number().int(), mes: z.number().int().min(1).max(12), codSenador: z.number().int(), tipoDespesa: z.string().nullish().transform(value => value?.trim() || "Categoria não informada pelo Senado"), fornecedor: z.string(), documento: z.string().nullish(), data: z.string().nullish(), tipoDocumento: z.string().nullish(), valorReembolsado: z.number().finite() });
export type SenateExpense = z.infer<typeof expenseSchema>;
export function parseSenateExpenses(raw: unknown, year: number) {
  const parsed = z.array(expenseSchema).max(250000).safeParse(raw);
  if (!parsed.success || parsed.data.some(row => row.ano !== year)) throw new Error("Dados CEAPS incompatíveis com o exercício solicitado.");
  if (new Set(parsed.data.map(row => row.id)).size !== parsed.data.length) throw new Error("Documentos CEAPS duplicados; nenhum total parcial foi publicado.");
  return parsed.data;
}
const expenseCache = new Map<number, { expires: number; promise: Promise<SenateExpense[]> }>();
export async function getSenateExpenses(id: string, year: number, month?: number) {
  if (!/^\d{1,9}$/.test(id)) throw new Error("Senador inválido.");
  const source = `${SENATE_ADM}/senadores/despesas_ceaps/${year}`;
  let cached = expenseCache.get(year);
  if (!cached || cached.expires < Date.now()) {
    if (expenseCache.size >= 2) expenseCache.delete(expenseCache.keys().next().value!);
    const promise = officialText(source).then(text => parseSenateExpenses(JSON.parse(text), year)).catch(error => { expenseCache.delete(year); throw error; });
    cached = { expires: Date.now() + 3600000, promise }; expenseCache.set(year, cached);
  }
  const records = (await cached.promise).filter(row => row.codSenador === Number(id) && (month === undefined || row.mes === month)).sort((a, b) => (b.data || "").localeCompare(a.data || "") || b.id - a.id);
  const group = (field: "tipoDespesa" | "fornecedor") => {
    const totals = new Map<string, number>(); for (const row of records) totals.set(row[field], (totals.get(row[field]) || 0) + Math.round(row.valorReembolsado * 100));
    return [...totals].map(([name, cents]) => ({ name, value: cents / 100 })).sort((a, b) => b.value - a.value);
  };
  return { records, total: records.length ? sumPublished(records.map(row => row.valorReembolsado)) : null, categories: group("tipoDespesa"), suppliers: group("fornecedor"), source, year, month: month ?? null, fetchedAt: new Date().toISOString() };
}
const salaryFields = ["remuneracao_basica", "vantagens_pessoais", "funcao_comissionada", "gratificacao_natalina", "horas_extras", "outras_eventuais", "abono_permanencia", "reversao_teto_constitucional"] as const;
const payrollSchema = z.object({ sequencial: z.number().int(), nome: z.string(), ano: z.number().int(), mes: z.number().int(), tipo_folha: z.string(), remuneracao_basica: z.string(), vantagens_pessoais: z.string(), funcao_comissionada: z.string(), gratificacao_natalina: z.string(), horas_extras: z.string(), outras_eventuais: z.string(), abono_permanencia: z.string(), reversao_teto_constitucional: z.string(), remuneracao_liquida: z.string() });
export function parseSenatePayroll(raw: unknown, year: number, month: number) {
  const parsed = z.array(payrollSchema).max(100000).safeParse(raw);
  if (!parsed.success || parsed.data.some(row => row.ano !== year || row.mes !== month)) throw new Error("A folha do Senado não corresponde à competência solicitada.");
  const index = new Map<string, { identities: Set<number>; gross: number; net: number; breakdown: Record<string,number> }>();
  for (const row of parsed.data) {
    const key = normalizePublicName(row.nome), existing = index.get(key) || { identities: new Set<number>(), gross: 0, net: 0, breakdown: {} as Record<string,number> };
    existing.identities.add(row.sequencial);
    for(const field of salaryFields){const cents=Math.round(publicMoney(row[field])*100);existing.breakdown[field]=(existing.breakdown[field]||0)+cents;existing.gross+=cents;}
    existing.net += Math.round(publicMoney(row.remuneracao_liquida) * 100); index.set(key, existing);
  }
  return index;
}
const payrollCache = new Map<string, { expires: number; promise: Promise<ReturnType<typeof parseSenatePayroll>> }>();
async function payroll(year: number, month: number) {
  const key = `${year}-${month}`, cached = payrollCache.get(key); if (cached && cached.expires > Date.now()) return cached.promise;
  if (payrollCache.size >= 12) payrollCache.delete(payrollCache.keys().next().value!);
  const promise = officialText(`${SENATE_ADM}/servidores/remuneracoes/${year}/${month}`).then(text => parseSenatePayroll(JSON.parse(text), year, month)).catch(error => { payrollCache.delete(key); throw error; });
  payrollCache.set(key, { expires: Date.now() + 3600000, promise }); return promise;
}
const resourceSchema = z.object({ data: z.array(z.object({ ano: z.number().int(), gastosNaoInclusos: z.object({ despesas: z.array(z.object({ recurso: z.string(), valor: z.number().finite() })), totalValor: z.number().finite() }).optional(), beneficios: z.array(z.object({ beneficio: z.string(), utilizacao: z.string() })).optional(), pessoal: z.array(z.object({ local: z.string(), quantidade: z.number().int() })).optional() })) });
export async function getSenateResources(id: string, year: number) {
  const source = `${SENATE_ADM}/senadores/${id}/recursos-utilizados?ano=${year}`;
  const parsed = resourceSchema.safeParse(JSON.parse(await officialText(source)));
  if (!parsed.success || parsed.data.data.length !== 1 || parsed.data.data[0].ano !== year) throw new Error("Os recursos do Senado não correspondem ao ano solicitado.");
  return { ...parsed.data.data[0], source };
}
export async function getSenateCosts(id: string, year: number, month?: number) {
  const roster = await getSenators(); const senator = roster.senators.find(row => row.id === id); if (!senator) throw new Error("Senador não localizado na lista atual em exercício.");
  const period = selectionWindow(year, month), salarySource = `${SENATE_ADM}/servidores/remuneracoes/${year}/${month || period.months.at(-1) || 1}`;
  const [expenses, wages, resources] = await Promise.all([
    getSenateExpenses(id, year, month).catch(() => null),
    mapLimited(period.months, 3, async m => { try { const index = await payroll(year, m), row = index.get(normalizePublicName(senator.civilName)); return row && row.identities.size === 1 ? { gross: row.gross / 100, net: row.net / 100, breakdown: row.breakdown } : { gross: null, net: null, breakdown: null }; } catch { return { gross: null, net: null, breakdown: null }; } }),
    getSenateResources(id, year).catch(() => null),
  ]);
  const components: CostComponent[] = [
    { key: "salary", label: "Remuneração bruta do senador", details: salaryFields.map((key,i)=>({key,label:["Remuneração básica","Vantagens pessoais","Função comissionada","13º · gratificação natalina","Horas extras","Outras verbas eventuais","Abono de permanência","Reversão do teto constitucional"][i],value:sumPublished(wages.filter(row=>row.gross!==null).map(row=>row.breakdown?row.breakdown[key]/100:null))})), value: sumPublished(month===undefined?wages.flatMap(row=>row.gross===null?[]:[row.gross]):wages.map(row=>row.gross)), coverageLabel: `Competências confirmadas: ${period.months.filter((_,i)=>wages[i].gross!==null).map(m=>String(m).padStart(2,"0")).join(", ") || "nenhuma"}/${year}. Ausências ficam fora da soma parcial.`, source: salarySource, note: "Nome civil exato e único na folha; inclui folhas normal e suplementar e estornos. Não usa subsídio presumido." },
    { key: "quota", label: "CEAPS · valor reembolsado", value: expenses?.total ?? null, source: expenses?.source || `${SENATE_ADM}/senadores/despesas_ceaps/${year}`, note: "Despesas identificadas pelo código do senador, somente no período selecionado." },
    { key: "staff", label: "Remuneração dos assessores", value: null, source: resources?.source || "https://www12.senado.leg.br/transparencia/sen/senadores", note: "A lotação atual não comprova a lotação em cada mês da folha. Não atribuímos remuneração histórica por associação aproximada." },
    { key: "other", label: "Outros recursos fora da CEAPS", value: month === undefined ? resources?.gastosNaoInclusos?.totalValor ?? null : null, source: resources?.source || "https://www12.senado.leg.br/transparencia/sen/senadores", note: "A fonte publica este bloco por ano. Não é somado ao custo de um mês isolado." },
    { key: "central", label: "Estrutura central sem rateio", value: null, source: "https://www12.senado.leg.br/transparencia/", note: "Custos institucionais sem atribuição individual verificada ficam fora da soma." },
  ];
  return { ...composeIdentifiedCost(components, period.days), period, salaryNet: sumPublished(wages.filter(row=>row.gross!==null).map(row => row.net)), staff: [], staffSource: resources?.source || "https://www12.senado.leg.br/transparencia/sen/senadores", resources, note: "Custo identificado, parcial. Despesas da cota não são salário. Blocos anuais e mensais não são misturados; gastos desconhecidos não viram zero.", fetchedAt: new Date().toISOString() };
}
export type SenateExpenseResult = Awaited<ReturnType<typeof getSenateExpenses>>;
