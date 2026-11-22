import { z } from "zod";
import snapshot from "../data/federal-powers.json";
import { officialText } from "./official-source";
type Power="executive"|"judiciary"|"legislative"|"autonomous";
const labels:Record<Power,string>={executive:"Executivo",judiciary:"Judiciário",legislative:"Legislativo",autonomous:"MP e Defensoria"};
const numberValue=z.object({value:z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number).refine(Number.isFinite)});
const rowSchema=z.object({code:z.object({value:z.string().regex(/^\d{5}$/)}),name:z.object({value:z.string()}),paid:numberValue,authorized:numberValue,updated:z.object({value:z.string()})});
export function parseFederalPowers(raw:unknown){
 const data=z.object({results:z.object({bindings:z.array(rowSchema)})}).safeParse(raw);if(!data.success)throw new Error("Estrutura do SIOP incompatível. Nenhum total parcial foi publicado.");
 const rows=data.data.results.bindings,known=new Map(snapshot.organizations.map(row=>[row.code,row]));
 if(rows.length!==known.size||new Set(rows.map(row=>row.code.value)).size!==rows.length||rows.some(row=>!known.has(row.code.value))||new Set(rows.map(row=>row.updated.value)).size!==1)throw new Error("A lista de órgãos do SIOP mudou ou ficou incompleta. Comparação não publicada.");
 const updatedAt=rows[0].updated.value;if(!/^2026-\d{2}-\d{2}T/.test(updatedAt)||!Number.isFinite(Date.parse(updatedAt)))throw new Error("O SIOP não confirmou a data de atualização de 2026.");
 const organizations=rows.map(row=>({code:row.code.value,name:row.name.value,paid:row.paid.value,authorized:row.authorized.value,power:known.get(row.code.value)!.power as Power}));
 return summarize(organizations,updatedAt);
}
function summarize(organizations:{code:string;name:string;paid:number;authorized:number;power:Power}[],updatedAt:string){
 const sum=(rows:typeof organizations,key:"paid"|"authorized")=>rows.reduce((total,row)=>total+Math.round(row[key]*100),0)/100;
 const groups=(["executive","judiciary","legislative","autonomous"] as Power[]).map(power=>{const rows=organizations.filter(row=>row.power===power);return{power,name:labels[power],paid:sum(rows,"paid"),authorized:sum(rows,"authorized"),organizations:rows.sort((a,b)=>b.paid-a.paid)};});
 return{year:2026,totalPaid:sum(organizations,"paid"),totalAuthorized:sum(organizations,"authorized"),groups,updatedAt,debtPaid:organizations.find(row=>row.code==="75000")?.paid??null,forecast:snapshot.forecast,source:snapshot.source,classificationSource:snapshot.classificationSource,note:"Orçamento Fiscal e da Seguridade Social da União. Valores pagos do orçamento de 2026; não incluem automaticamente restos de anos anteriores nem gastos próprios dos estados e municípios. Inclui despesas financeiras, amortização e refinanciamento da dívida. Legislativo inclui Câmara, Senado e TCU. Ministério Público e Defensoria aparecem à parte."};
}
let cached:{expires:number;promise:Promise<Awaited<ReturnType<typeof load>>>}|null=null;
async function load(){
 const source=`${snapshot.endpoint}?${new URLSearchParams({query:snapshot.query,format:"application/sparql-results+json"})}`;
 try{return{...parseFederalPowers(JSON.parse(await officialText(source,500000))),origin:"live",dataSource:source,fetchedAt:new Date().toISOString()};}
 catch{return{...summarize(snapshot.organizations as {code:string;name:string;paid:number;authorized:number;power:Power}[],snapshot.updatedAt),origin:"verified-snapshot",dataSource:source,fetchedAt:new Date().toISOString()};}
}
export async function federalPowers(){if(!cached||cached.expires<Date.now())cached={expires:Date.now()+3600000,promise:load()};return cached.promise;}
export type FederalPowersResult=Awaited<ReturnType<typeof federalPowers>>;
