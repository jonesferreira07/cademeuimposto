import {it,expect} from "vitest";
import {sendAdMail,receiptAttachment} from "../src/lib/advertising/mail";
// Só executa mediante solicitação explícita do operador; envia dois testes ao próprio proprietário.
it.skipIf(process.env.CMI_AD_EMAIL_TEST!=="1")("confirma aceitação real do e-mail e anexo, sem pedido nem pagamento",async()=>{
 const id="00000000-0000-4000-8000-000000000077",input={brand:"TESTE SEM PAGAMENTO",phrase:"TESTE DE INTEGRACAO. NENHUM ANUNCIO FOI COMPRADO.",website:"https://www.cademeuimposto.com",contact:"jonesferreira07@gmail.com",coupon:"TESTE"},order={id,input,createdAt:new Date().toISOString()};
 const stream='BT /F1 14 Tf 20 140 Td (TESTE DE INTEGRACAO - NAO E PAGAMENTO) Tj 0 -30 Td (Nenhum Pix foi realizado.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 450 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=Buffer.byteLength(pdf);pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 expect(await sendAdMail(order,undefined,true)).toEqual({accepted:true});expect(await sendAdMail(order,receiptAttachment(Buffer.from(pdf),'application/pdf',id),true)).toEqual({accepted:true});
},60000);
