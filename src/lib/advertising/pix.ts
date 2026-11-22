import { AD_PRICE_CENTS } from "./schema";
// Código estático fornecido pelo proprietário; sem conexão com conta bancária.
export const PIX_BASE_PAYLOAD = "00020126470014BR.GOV.BCB.PIX0125jonesferreira7@icloud.com5204000053039865802BR5901N6001C62070503***63041E01";
export function crc16(text: string) {
 let crc=0xffff;
 for(const byte of new TextEncoder().encode(text)){crc^=byte<<8;for(let i=0;i<8;i++)crc=crc&0x8000?(crc<<1)^0x1021:crc<<1;crc&=0xffff;}
 return crc.toString(16).toUpperCase().padStart(4,"0");
}
export function readPixFields(payload: string) {
 const fields=new Map<string,string>();let offset=0;
 while(offset<payload.length){const id=payload.slice(offset,offset+2),size=Number(payload.slice(offset+2,offset+4));if(!/^\d{2}$/.test(id)||!Number.isInteger(size)||size<0||offset+4+size>payload.length||fields.has(id))throw new Error("Pix inválido.");fields.set(id,payload.slice(offset+4,offset+4+size));offset+=size+4;}
 return fields;
}
const tlv=(id:string,value:string)=>{const size=new TextEncoder().encode(value).length;if(size>99)throw new Error("Campo Pix excedeu o tamanho permitido.");return id+String(size).padStart(2,"0")+value;};
export function orderPix(orderId: string, amountCents=AD_PRICE_CENTS) {
 if(!/^[a-f0-9-]{36}$/i.test(orderId)||amountCents!==AD_PRICE_CENTS)throw new Error("Pedido ou valor Pix inválido.");
 const fields=readPixFields(PIX_BASE_PAYLOAD);
 if(crc16(PIX_BASE_PAYLOAD.slice(0,-4))!==fields.get("63")||fields.get("53")!=="986"||fields.get("58")!=="BR")throw new Error("O código Pix fornecido não passou na validação.");
 const reference=`CMI${orderId.replaceAll("-","").slice(0,20).toUpperCase()}`;
 fields.set("54",(amountCents/100).toFixed(2));fields.set("62",tlv("05",reference));fields.delete("63");
 const data=[...fields].sort(([a],[b])=>a.localeCompare(b)).map(([id,value])=>tlv(id,value)).join("")+"6304";
 return {code:data+crc16(data),reference,key:readPixFields(fields.get("26")!).get("01")!};
}
