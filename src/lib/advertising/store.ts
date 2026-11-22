import { mkdir,writeFile,readFile,readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AD_DURATION_DAYS,AD_PRICE_CENTS,type AdInput } from "./schema";
import { receiptSigningReady } from "./receipt-token";
import campaigns from "../../data/advertisements.json";
import { z } from "zod";
export type AdOrder={id:string;brand:string;phrase:string;website:string;contact:string;coupon:string;createdAt:string;priceCents:number;durationDays:number;paymentConfirmedAt:string|null;approvedAt:string|null;startsAt:string|null;expiresAt:string|null;status:"pending"|"active"|"rejected"};
export const adStoreAvailable=()=>!process.env.VERCEL||receiptSigningReady();
export const orderDirectory=()=>path.join(process.cwd(),".data","ad-orders");
export async function createAdOrder(input:AdInput):Promise<AdOrder>{
 if(!adStoreAvailable())throw new Error("O registro de anúncios está temporariamente indisponível. Entre em contato com a equipe.");
 const order:AdOrder={id:randomUUID(),brand:input.brand,phrase:input.phrase,website:input.website,contact:input.contact,coupon:input.coupon,createdAt:new Date().toISOString(),priceCents:AD_PRICE_CENTS,durationDays:AD_DURATION_DAYS,paymentConfirmedAt:null,approvedAt:null,startsAt:null,expiresAt:null,status:"pending"};
 // O pedido em produção fica vinculado ao token assinado. O e-mail é enviado somente com o comprovante.
 if(process.env.VERCEL)return order;
 const dir=orderDirectory();await mkdir(dir,{recursive:true,mode:0o700});const files=await readdir(dir);if(files.filter(name=>name.endsWith(".json")).length>=1000)throw new Error("Fila de anúncios indisponível. Tente novamente mais tarde.");
 await writeFile(path.join(dir,`${order.id}.json`),JSON.stringify(order)+"\n",{flag:"wx",mode:0o600});return order;
}
export async function activeAdvertisement(now=new Date()){
 const campaignSchema=z.object({id:z.string().uuid(),brand:z.string().min(2).max(28),phrase:z.string().min(5).max(100),website:z.string().url().refine(value=>{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}),paymentConfirmedAt:z.string().datetime(),approvedAt:z.string().datetime(),startsAt:z.string().datetime(),expiresAt:z.string().datetime()});
 const published=z.array(campaignSchema).safeParse(campaigns);
 const campaign=published.success?published.data.find(row=>Date.parse(row.paymentConfirmedAt)<=Date.parse(row.startsAt)&&Date.parse(row.approvedAt)<=Date.parse(row.startsAt)&&Date.parse(row.expiresAt)-Date.parse(row.startsAt)===AD_DURATION_DAYS*86400000&&Date.parse(row.startsAt)<=now.getTime()&&Date.parse(row.expiresAt)>now.getTime()):null;
 if(campaign)return{id:campaign.id,brand:campaign.brand,phrase:campaign.phrase,website:campaign.website,expiresAt:campaign.expiresAt};
 if(process.env.VERCEL)return null;
 if(!adStoreAvailable())return null;
 let files:string[];try{files=await readdir(orderDirectory());}catch{return null;}
 const orders=(await Promise.all(files.filter(file=>/^[a-f0-9-]{36}\.json$/.test(file)).slice(0,1000).map(async file=>{try{return JSON.parse(await readFile(path.join(orderDirectory(),file),"utf8")) as AdOrder;}catch{return null;}}))).filter((order):order is AdOrder=>!!order&&order.status==="active"&&!!order.paymentConfirmedAt&&!!order.approvedAt&&!!order.startsAt&&!!order.expiresAt&&Date.parse(order.startsAt)<=now.getTime()&&Date.parse(order.expiresAt)>now.getTime());
 const order=orders.sort((a,b)=>Date.parse(a.startsAt!)-Date.parse(b.startsAt!))[0];
 return order?{id:order.id,brand:order.brand,phrase:order.phrase,website:order.website,expiresAt:order.expiresAt}:null;
}
