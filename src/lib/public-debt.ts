import { z } from "zod";
import snapshot from "../data/public-debt.json";
import { states } from "./states";
import { brazilDate } from "./finance";
import { mapLimited, officialText } from "./official-source";
export const DEBT_API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf";
export function debtSource(code: string, period: number) {
  return `${DEBT_API}?${new URLSearchParams({an_exercicio:"2026",in_periodicidade:"Q",nr_periodo:String(period),co_tipo_demonstrativo:"RGF",no_anexo:"RGF-Anexo 02",co_esfera:"E",co_poder:"E",id_ente:code,limit:"5000"})}`;
}
const debtRow = z.object({exercicio:z.literal(2026),periodo:z.number(),periodicidade:z.literal("Q"),uf:z.string(),cod_ibge:z.number(),co_poder:z.literal("E"),esfera:z.literal("E"),anexo:z.literal("RGF-Anexo 02"),rotulo:z.string(),coluna:z.string(),cod_conta:z.string(),valor:z.number().finite()});
export function parseStateDebt(raw: unknown, uf: string, period: number) {
  const parsed=z.object({items:z.array(debtRow),hasMore:z.literal(false)}).safeParse(raw), state=states.find(row=>row.uf===uf);
  if (!parsed.success || !state || !parsed.data.items.length || parsed.data.items.some(row=>row.uf!==uf || row.cod_ibge!==Number(state.code) || row.periodo!==period)) throw new Error("Relatório da dívida incompleto ou de outro estado/período.");
  const one=(code:string)=>{const rows=parsed.data.items.filter(row=>row.cod_conta===code && row.rotulo==="Padrão" && row.coluna===`Até o ${period}º Quadrimestre`); if(rows.length!==1)throw new Error("Conta de dívida ausente ou duplicada.");return rows[0].valor;};
  const gross=one("DividaConsolidada"), net=one("DividaConsolidadaLiquida");
  if(gross<0)throw new Error("Dívida consolidada incompatível na fonte.");
  return {uf:state.uf,name:state.name,gross,net,source:debtSource(state.code,period)};
}
export function parseNationalDebt(amount:unknown,ratio:unknown) {
  const series=z.array(z.object({data:z.string().regex(/^01\/(0[1-9]|1[0-2])\/2026$/),valor:z.string().regex(/^\d+(?:\.\d+)?$/)})).length(1),a=series.safeParse(amount),r=series.safeParse(ratio);
  if(!a.success || !r.success || a.data[0].data!==r.data[0].data)throw new Error("As séries de dívida e PIB não confirmaram o mesmo mês de 2026.");
  // SGS 13761 é publicado em milhões de reais; 13762 é percentual do PIB.
  const gross=Math.round(Number(a.data[0].valor)*1000000),gdpPercent=Number(r.data[0].valor);
  if(!Number.isFinite(gross)||!Number.isFinite(gdpPercent))throw new Error("Valor da dívida inválido.");
  return {...snapshot.national,date:a.data[0].data,gross,gdpPercent};
}
export function rankStateDebt(records:typeof snapshot.records) {
  if(records.length!==27 || new Set(records.map(row=>row.uf)).size!==27 || states.some(state=>!records.some(row=>row.uf===state.uf)))throw new Error("Comparação da dívida exige as 27 UFs no mesmo quadrimestre.");
  const sorted=records.toSorted((a,b)=>b.gross-a.gross||a.name.localeCompare(b.name,"pt-BR"));
  return sorted.map(row=>({...row,rank:1+sorted.filter(other=>Math.round(other.gross*100)>Math.round(row.gross*100)).length}));
}
let cache:{expires:number;promise:Promise<Awaited<ReturnType<typeof load>>>}|null=null;
async function load(){
  const [national,regional]=await Promise.all([
    (async()=>{try{const [a,r]=await Promise.all([officialText(snapshot.national.amountSource),officialText(snapshot.national.ratioSource)]);return{...parseNationalDebt(JSON.parse(a),JSON.parse(r)),origin:"live",checkedAt:new Date().toISOString()};}catch{return{...snapshot.national,origin:"verified-snapshot",checkedAt:snapshot.checkedAt};}})(),
    (async()=>{const current=brazilDate(),period=current.year>2026?3:Math.min(3,Math.floor((current.month-1)/4));try{if(period<1)throw new Error("Quadrimestre ainda aberto.");const records=await mapLimited([...states],4,async state=>parseStateDebt(JSON.parse(await officialText(debtSource(state.code,period),1000000)),state.uf,period));return{records:rankStateDebt(records),period,origin:"live",checkedAt:new Date().toISOString()};}catch{return{records:rankStateDebt(snapshot.records),period:snapshot.period,origin:"verified-snapshot",checkedAt:snapshot.checkedAt};}})(),
  ]);
  return{year:2026,national,regional,note:"Estoque de dívida, não gasto acumulado no ano. Brasil: Dívida Bruta do Governo Geral (DBGG), que abrange governo federal, INSS, estados e municípios, conforme metodologia do Banco Central. Estados: Dívida Consolidada (DC) e Dívida Consolidada Líquida (DCL) declaradas no RGF, Anexo 02. Os conceitos não são equivalentes; não some os estados ao total nacional. DCL negativa significa deduções superiores à dívida consolidada, não valor ausente."};
}
export async function publicDebt(){if(!cache||cache.expires<Date.now())cache={expires:Date.now()+3600000,promise:load()};return cache.promise;}
export type PublicDebt=Awaited<ReturnType<typeof publicDebt>>;
