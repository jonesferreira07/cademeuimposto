import federalAuthors from "../data/amendment-authors.json";
import senateAuthors from "../data/senate-amendment-authors.json";
import snapshot from "../data/amendment-execution-2026.json";
import { amendmentTotals, AMENDMENT_SOURCE, loadAmendmentIndex, type Amendment } from "./amendments";
import { federalRoster } from "./parliament-ranking";
import { getSenators } from "./senate";
import { getState } from "./states";
import { normalizePublicName } from "./official-source";

export type AmendmentMetric = "paid" | "committed" | "liquidated" | "awaitingLiquidation";
type Person = { id: string; name: string; party: string; uf: string; photo: string | null; profile: string };
type Identity = { authorCode: string; authorName: string; uf: string; deputyName?: string; senatorName?: string };
type Execution = Pick<Amendment,"code"|"authorCode"|"authorName"|"committed"|"liquidated"|"paid"|"remainingPaid"> & {amendmentCount?:number};
export function rankAmendments(people: Person[], identities: Record<string, Identity>, amendments: Execution[], metric: AmendmentMetric) {
  if (new Set(people.map(person => person.id)).size !== people.length) throw new Error("Composição parlamentar duplicada. Ranking não publicado.");
  const groups = new Map<string, Execution[]>();
  for (const row of amendments) { const rows = groups.get(row.authorCode) || []; rows.push(row); groups.set(row.authorCode, rows); }
  let unlinked = 0, withoutRecords = 0, inconsistent = 0;
  const eligible = people.flatMap(person => {
    const identity = identities[person.id];
    if (!identity || identity.uf !== person.uf || normalizePublicName(identity.deputyName || identity.senatorName || "") !== normalizePublicName(person.name)) { unlinked++; return []; }
    const records = groups.get(identity.authorCode) || [];
    if (!records.length) { withoutRecords++; return []; }
    if (records.some(row => normalizePublicName(row.authorName) !== normalizePublicName(identity.authorName)) || new Set(records.map(row => row.code)).size !== records.length) { inconsistent++; return []; }
    const totals = amendmentTotals(records), value = totals[metric];
    if (value === null || value < 0) { inconsistent++; return []; }
    return [{ ...person, authorCode: identity.authorCode, amendments: records.reduce((sum,row)=>sum+(row.amendmentCount??1),0), ...totals, value }];
  }).sort((a,b) => b.value - a.value || a.name.localeCompare(b.name,"pt-BR"));
  const records = eligible.map(row => ({ ...row, rank: 1 + eligible.filter(other => Math.round(other.value*100) > Math.round(row.value*100)).length }));
  return { records, top: records.slice(0,3), unlinked, withoutRecords, inconsistent };
}
export async function amendmentRanking(house: "camara" | "senado", year: number, metric: AmendmentMetric, uf?: string | null) {
  if (year !== 2026 || (uf && !getState(uf))) throw new Error("Período ou estado inválido.");
  const execution=(async()=>{let timer:ReturnType<typeof setTimeout>|undefined;try{const index=await Promise.race([loadAmendmentIndex(year),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Tempo de consulta CGU excedido.")),25000);})]);return{amendments:index.amendments as Execution[],publishedAt:index.publishedAt,origin:"live",checkedAt:new Date().toISOString()};}catch{return{amendments:snapshot.records,publishedAt:snapshot.publishedAt,origin:"verified-snapshot",checkedAt:snapshot.checkedAt};}finally{clearTimeout(timer);}})();
  const [roster, index] = await Promise.all([house === "camara" ? federalRoster() : getSenators().then(result => result.senators), execution]);
  const people = uf ? roster.filter(person => person.uf === uf) : roster;
  const authors = house === "camara" ? federalAuthors : senateAuthors;
  return { ...rankAmendments(people,authors.links,index.amendments,metric), year, house, metric, rosterCount: people.length, source: AMENDMENT_SOURCE, authorSource: authors.source, publishedAt: index.publishedAt, origin:index.origin, checkedAt:index.checkedAt, fetchedAt: new Date().toISOString(), note: "Execução das emendas individuais do orçamento de 2026, acumulada desde janeiro até a última publicação da CGU. Apenas autores vinculados por código e nome exatos à composição atual. Emendas coletivas e autores sem vínculo confirmado ficam fora. Empenhado é compromisso; liquidado é obrigação verificada; pago é desembolso. Falta liquidar = empenhado menos liquidado. As etapas não devem ser somadas. Maior execução não comprova melhor resultado; emenda não é dinheiro recebido pessoalmente pelo parlamentar. Restos a pagar de outros exercícios não entram nesta comparação." };
}
export type AmendmentRanking = Awaited<ReturnType<typeof amendmentRanking>>;
