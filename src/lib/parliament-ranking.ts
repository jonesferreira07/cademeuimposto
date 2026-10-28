import { getDeputies } from "./camara";
import { getSenators } from "./senate";
import { getCotaComparative, comparativePerson } from "./cota-comparative";
import { getSenateExpenses } from "./senate-finance";
import { selectionWindow, mapLimited } from "./official-source";
import { getState } from "./states";
type Person = { id: string; name: string; party: string; uf: string; photo: string | null; profile: string };
type Published = Person & { spent: number | null; documents: number };
export function rankPublishedQuota(input: Published[]) {
  if (new Set(input.map(row => row.id)).size !== input.length) throw new Error("Identificadores repetidos no ranking. Comparação não publicada.");
  const eligible = input.filter(row => row.spent !== null && row.spent >= 0 && row.documents > 0);
  const sorted = eligible.toSorted((a,b) => Math.round(a.spent! * 100) - Math.round(b.spent! * 100) || a.name.localeCompare(b.name,"pt-BR") || a.id.localeCompare(b.id));
  const records = sorted.map(row => ({ ...row, spent: row.spent!, rank: 1 + sorted.filter(other => Math.round(other.spent! * 100) < Math.round(row.spent! * 100)).length }));
  return { records, top: records.slice(0,3), excluded: input.length - eligible.length, withoutRecords: input.filter(row => row.documents === 0 || row.spent === null).length, netRefunds: input.filter(row => row.spent !== null && row.spent < 0 && row.documents > 0).length };
}
export async function federalRoster() {
  const people: Person[] = [];
  for (let page=1;page<=10;page++) {
    const result = await getDeputies({page:String(page)});
    people.push(...result.deputies.map(row => ({ id: String(row.id), name: row.nome, party: row.siglaPartido, uf: row.siglaUf, photo: row.urlFoto || null, profile: `https://www.camara.leg.br/deputados/${row.id}` })));
    if (!result.hasNext) return people;
  }
  throw new Error("Lista federal incompleta. Ranking não publicado.");
}
export async function parliamentRanking(house: "camara" | "senado", year: number, uf?: string | null) {
  if (uf && !getState(uf)) throw new Error("Estado inválido.");
  const period = selectionWindow(year);
  period.label = `1º de janeiro a ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza" }).format(new Date())}`;
  const roster: Person[] = house === "camara" ? await federalRoster() : (await getSenators()).senators;
  if (!roster.length || new Set(roster.map(row => row.id)).size !== roster.length) throw new Error("Composição parlamentar não validada.");
  const selected = uf ? roster.filter(row => row.uf === uf) : roster;
  // Uma única versão do arquivo da casa, compartilhada pelo cache. Nenhuma falha vira zero.
  const comparative = house === "camara" ? await getCotaComparative(year) : null;
  const rows = await mapLimited(selected, 8, async person => {
    if (house === "camara") {
      const row = comparativePerson(comparative!.index,person.name,person.uf);
      return { ...person, spent: row?.total ?? null, documents: row?.entries || 0, publishedAt: null, source: comparative!.source };
    }
    const expenses = await getSenateExpenses(person.id,year), records = expenses.records.filter(row => period.months.includes(row.mes));
    return { ...person, spent: records.length ? records.reduce((sum,row) => sum + Math.round(row.valorReembolsado * 100),0)/100 : null, documents: records.length, publishedAt: null, source: expenses.source };
  });
  return { ...rankPublishedQuota(rows), house, period, uf: uf || null, rosterCount: selected.length, source: rows[0]?.source || "https://www.camara.leg.br/transparencia/", publishedAt: rows[0]?.publishedAt || null, fetchedAt: new Date().toISOString(), note: "Comparação provisória de despesas publicadas da cota (CEAP ou CEAPS), da composição atual, acumuladas de janeiro até a consulta. O comparativo da Câmara inclui passagens SIGEPA; suas linhas são rubricas, não notas fiscais. Não compara custo total, salários, assessores, emendas ou qualidade das entregas. Limites de cota, afastamentos e tempo em exercício podem variar. Menor despesa, isoladamente, não comprova economicidade. Sem registros não é gasto zero; saldo líquido negativo por estornos fica fora do Top 3. Empates têm a mesma posição; o desempate visual é alfabético." };
}
export type ParliamentRanking = Awaited<ReturnType<typeof parliamentRanking>>;
