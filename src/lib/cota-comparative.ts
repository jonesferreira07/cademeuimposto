import { parse } from "csv-parse/sync";
import { getState } from "./states";
import { normalizePublicName, officialText, publicMoney, mapLimited } from "./official-source";
const monthCodes=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
export type CotaCategory={name:string;value:number};
type Entry={name:string;uf:string;categories:CotaCategory[];total:number;entries:number};
export function parseCotaComparative(csv:string) {
 const rows=parse(csv,{delimiter:";",columns:true,bom:true,skip_empty_lines:true}) as Record<string,string>[];
 if(!rows.length||rows.some(row=>!row.Nome||!getState(row.UF)||!row.Tipo_de_Despesa||!row.Valor))throw new Error("Comparativo da Câmara incompatível. Total não publicado.");
 const index=new Map<string,Entry>();
 for(const row of rows){const key=`${row.UF}:${normalizePublicName(row.Nome)}`, previous=index.get(key)||{name:row.Nome,uf:row.UF,categories:[],total:0,entries:0};const value=publicMoney(row.Valor);previous.categories.push({name:row.Tipo_de_Despesa,value});previous.total+=Math.round(value*100);previous.entries++;index.set(key,previous);}
 for(const row of index.values()){row.total/=100;const grouped=new Map<string,number>();for(const category of row.categories)grouped.set(category.name,(grouped.get(category.name)||0)+Math.round(category.value*100));row.categories=[...grouped].map(([name,cents])=>({name,value:cents/100})).sort((a,b)=>b.value-a.value);}
 return index;
}
const cache=new Map<string,{expires:number;promise:Promise<{index:Map<string,Entry>;source:string}>}>();
export async function getCotaComparative(year:number,month?:number){
 const key=`${year}-${month||"all"}`,old=cache.get(key);if(old&&old.expires>Date.now())return old.promise;
 const params=new URLSearchParams({legislatura:"57",deputado:"",ano:String(year),por:"deputado",mes:month?monthCodes[month-1]:"",partido:"",uf:""});
 const source=`https://www.camara.leg.br/transparencia/api/download/tabelaComparativa.csv?${params}`;
 const promise=officialText(source,8000000).then(csv=>({index:parseCotaComparative(csv),source})).catch(error=>{cache.delete(key);throw error;});
 if(cache.size>=13)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+1800000,promise});return promise;
}
export function comparativePerson(index:Map<string,Entry>,name:string,uf:string){return index.get(`${uf}:${normalizePublicName(name)}`)||null;}
export async function comparativePeriod(name:string,uf:string,year:number,months:number[]){
 const data=await mapLimited(months,4,month=>getCotaComparative(year,month));const rows=data.map(item=>comparativePerson(item.index,name,uf));
 return { total:rows.some(row=>row!==null)?rows.reduce((sum,row)=>sum+Math.round((row?.total??0)*100),0)/100:null, sources:data.map(item=>item.source) };
}
