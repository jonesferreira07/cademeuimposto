import { z } from "zod";
export const AD_PRICE_CENTS=990;
export const AD_DURATION_DAYS=3;
export const adInputSchema=z.object({
 brand:z.string().trim().min(2,"A marca precisa ter de 2 a 28 caracteres.").max(28,"A marca precisa ter de 2 a 28 caracteres."),
 phrase:z.string().trim().min(5,"Descreva sua oferta em uma frase.").max(100,"Use até 100 caracteres na frase."),
 website:z.string().trim().url("Informe um site válido com https://.").max(300).refine(value=>{try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password;}catch{return false;}},"Use um endereço seguro com https://."),
 contact:z.string().trim().min(8,"Informe e-mail ou WhatsApp para contato.").max(120).refine(value=>/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)||/^\+?[\d ()-]{10,24}$/.test(value),"Informe e-mail ou WhatsApp válido."),
 coupon:z.string().trim().max(24).regex(/^[a-zA-Z0-9_-]*$/,"O cupom aceita letras, números, hífen e sublinhado.").transform(value=>value.toUpperCase()).default(""),
 companyWebsite:z.string().max(0).optional(),
});
export type AdInput=z.infer<typeof adInputSchema>;
