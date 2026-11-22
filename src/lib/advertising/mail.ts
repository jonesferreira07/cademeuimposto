import { createHash } from "node:crypto";
import { orderPix } from "./pix";
import { receiptSigningReady } from "./receipt-token";
import type { AdInput } from "./schema";
import { AD_CONTACT_EMAIL } from "./contact";
export { AD_CONTACT_EMAIL } from "./contact";
// O remetente padrão só permite envio ao proprietário da conta Resend.
// Um endereço próprio exige verificação do domínio no provedor.
export const adEmailAvailable=()=>receiptSigningReady()&&!!process.env.RESEND_API_KEY;
export const MAX_RECEIPT_BYTES=3*1024*1024;
export function receiptAttachment(bytes:Uint8Array,declaredType:string,id:string){
 if(!bytes.length||bytes.length>MAX_RECEIPT_BYTES)throw new Error("O comprovante precisa ter até 3 MB.");
 let extension:string,type:string;
 if(Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))){extension="png";type="image/png";}
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){extension="jpg";type="image/jpeg";}
 else if(Buffer.from(bytes.subarray(0,5)).toString("ascii")==="%PDF-"){extension="pdf";type="application/pdf";}
 else throw new Error("Envie comprovante em JPG, PNG ou PDF.");
 if(declaredType!==type)throw new Error("O formato do comprovante não corresponde ao arquivo.");
 return {bytes,type,filename:`comprovante-${id}.${extension}`};
}
type MailOrder={id:string;input:AdInput;createdAt:string};
export async function sendAdMail(order:MailOrder,attachment?:ReturnType<typeof receiptAttachment>,test=false){
 if(!adEmailAvailable())throw new Error("O envio automático de anúncios ainda não está configurado.");
 const fields:Record<string,string>={
  _subject:`${test?"[TESTE SEM PAGAMENTO] ":""}[Cadê Meu Imposto?] ${attachment?"COMPROVANTE":"NOVO ANÚNCIO"} · ${order.id}`,
  pedido:order.id,marca:order.input.brand,frase:order.input.phrase,site:order.input.website,contato:order.input.contact,cupom:order.input.coupon||"Não informado",valor:"R$9,90",exibicao:"3 dias após confirmação bancária e aprovação",identificador_pix:orderPix(order.id).reference,solicitado_em:order.createdAt,
  situacao:test?"TESTE DE INTEGRAÇÃO. NÃO É PEDIDO REAL. NÃO HOUVE PAGAMENTO.":attachment?"Comprovante recebido para análise. NÃO confirma pagamento. Conferir no banco antes de publicar.":"Solicitação enviada. Aguardando pagamento e comprovante. Não publicar ainda.",
 };
 const replyTo=/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(order.input.contact)?order.input.contact:undefined;
 const subject=fields._subject;delete fields._subject;
 const body={from:process.env.AD_MAIL_FROM||"Cadê Meu Imposto? <onboarding@resend.dev>",to:[AD_CONTACT_EMAIL],subject,text:Object.entries(fields).map(([key,value])=>`${key}: ${value}`).join("\n"),reply_to:replyTo,...(attachment?{attachments:[{filename:attachment.filename,content:Buffer.from(attachment.bytes).toString("base64"),content_type:attachment.type}]}:{})};
 const phase=attachment?createHash("sha256").update(attachment.bytes).digest("hex"):"pedido";
 let response:Response;try{response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`anuncio/${order.id}/${phase}`},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(20000)});}catch{throw new Error("O serviço de e-mail não respondeu. Tente novamente ou entre em contato com a equipe.");}
 const result=await response.json().catch(()=>null);
 if(!response.ok||typeof result?.id!=="string"||!result.id)throw new Error("Não foi possível encaminhar os dados ao e-mail da equipe. Tente novamente ou escreva para "+AD_CONTACT_EMAIL+".");
 return {accepted:true as const};
}
