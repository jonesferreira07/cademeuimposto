import { createHmac,timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { adInputSchema,type AdInput } from "./schema";
const claimsSchema=z.object({id:z.string().uuid(),input:adInputSchema,issuedAt:z.number().int()});
export const receiptSigningReady=()=>!!process.env.AD_RECEIPT_SIGNING_KEY&&process.env.AD_RECEIPT_SIGNING_KEY.length>=32;
function key(){if(!receiptSigningReady())throw new Error("O envio de comprovantes ainda não está configurado.");return process.env.AD_RECEIPT_SIGNING_KEY!;}
export function signReceiptToken(id:string,input:AdInput,now=Date.now()){
 const body=Buffer.from(JSON.stringify(claimsSchema.parse({id,input,issuedAt:now}))).toString("base64url");
 return `${body}.${createHmac("sha256",key()).update(body).digest("base64url")}`;
}
export function verifyReceiptToken(token:string,now=Date.now()){
 if(token.length>6000)throw new Error("Referência do pedido inválida.");
 const parts=token.split(".");if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))throw new Error("Referência do pedido inválida.");
 const expected=createHmac("sha256",key()).update(parts[0]).digest(),received=Buffer.from(parts[1],"base64url");
 if(received.length!==expected.length||!timingSafeEqual(received,expected))throw new Error("Referência do pedido inválida.");
 const claims=claimsSchema.parse(JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")));
 if(claims.issuedAt>now+60000||now-claims.issuedAt>7*86400000)throw new Error("O prazo para enviar este comprovante expirou. Entre em contato com a equipe e informe o pedido.");
 return claims;
}
