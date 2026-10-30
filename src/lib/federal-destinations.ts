import {z} from "zod";
import snapshot from "@/data/federal-destinations.json";
import {officialText} from "./official-source";
const cents=z.object({value:z.string().regex(/^-?\d+$/).transform(Number).refine(Number.isSafeInteger)});
const date=z.object({value:z.string().regex(/^2026-\d{2}-\d{2}T/).refine(v=>Number.isFinite(Date.parse(v)))});
const rowsSchema=z.object({results:z.object({bindings:z.array(z.object({code:z.object({value:z.string().regex(/^\d{2}$/)}),name:z.object({value:z.string().min(1)}),paidCents:cents,updated:date}))})});
const controlSchema=z.object({results:z.object({bindings:z.array(z.object({paidCents:cents,updated:date})).length(1)})});
export function parseFederalDestinations(raw:unknown,controlRaw:unknown){
 const parsed=rowsSchema.parse(raw).results.bindings,control=controlSchema.parse(controlRaw).results.bindings[0];
 const codes=new Set(snapshot.raw.results.bindings.map(r=>r.code.value));
 if(parsed.length!==codes.size||new Set(parsed.map(r=>r.code.value)).size!==codes.size||parsed.some(r=>!codes.has(r.code.value)))throw new Error("Funções orçamentárias incompletas ou duplicadas; total não publicado.");
 if(parsed.some(r=>r.updated.value!==control.updated.value))throw new Error("As consultas do SIOP têm datas divergentes.");
 const totalCents=parsed.reduce((s,r)=>s+r.paidCents.value,0);
 if(!Number.isSafeInteger(totalCents)||totalCents!==control.paidCents.value||totalCents<=0)throw new Error("A soma por áreas não confere com o total independente do SIOP.");
 return {year:2026,totalPaid:totalCents/100,updatedAt:control.updated.value,records:parsed.map(r=>({code:r.code.value,name:r.name.value,paid:r.paidCents.value/100,percent:r.paidCents.value/totalCents*100,perHundred:r.paidCents.value/totalCents*100})).sort((a,b)=>b.paid-a.paid||a.code.localeCompare(b.code)),source:snapshot.source};
}
const queryUrl=(query:string)=>`${snapshot.endpoint}?${new URLSearchParams({query,format:"application/sparql-results+json"})}`;
async function load(){
 try{
  const [raw,control]=await Promise.all([officialText(queryUrl(snapshot.query),500000),officialText(queryUrl(snapshot.controlQuery),50000)]);
  return {...parseFederalDestinations(JSON.parse(raw),JSON.parse(control)),origin:"live" as const,fetchedAt:new Date().toISOString()};
 }catch{return {...parseFederalDestinations(snapshot.raw,snapshot.control),origin:"verified-snapshot" as const,fetchedAt:new Date().toISOString()};}
}
let cache:{expires:number;promise:ReturnType<typeof load>}|null=null;
export function federalDestinations(){if(!cache||cache.expires<Date.now())cache={expires:Date.now()+3600000,promise:load()};return cache.promise;}
export type FederalDestinations=Awaited<ReturnType<typeof federalDestinations>>;
