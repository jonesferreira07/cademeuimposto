"use client";
import { useState } from "react";
import { Check,Upload } from "lucide-react";
export function AdReceipt({token}:{token:string}){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState("");
 async function send(event:React.FormEvent){
  event.preventDefault();setError("");if(!file){setError("Selecione o comprovante do Pix.");return;}if(file.size>3*1024*1024){setError("O comprovante precisa ter até 3 MB.");return;}
  setBusy(true);try{const body=new FormData();body.set("token",token);body.set("file",file);const response=await fetch("/api/anuncios/comprovante",{method:"POST",body}),result=await response.json();if(!response.ok||result.accepted!==true)throw new Error(result.error||"Não foi possível enviar.");setSent(true);setFile(null);}catch(error){setError(error instanceof Error?error.message:"Falha no envio. Tente novamente.");}finally{setBusy(false);}
 }
 return <section className="ad-receipt"><h3>Depois de pagar, envie o comprovante</h3>{sent?<div className="ad-receipt-success" role="status"><Check size={22}/><p>Comprovante encaminhado à equipe. Vamos conferir o pagamento no banco e analisar o anúncio antes da publicação.</p></div>:<form onSubmit={send}><label>Comprovante do Pix<input type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setError("");}}/></label><p>JPG, PNG ou PDF · até 3 MB. O arquivo vai ao e-mail da equipe pelo serviço de envio de e-mail e não aparece no anúncio público.</p><p>Envie apenas o comprovante necessário; você pode ocultar saldo e movimentações que não tenham relação com este Pix.</p><button className="ad-primary" type="submit" disabled={busy||!file}><Upload size={17}/>{busy?"Enviando…":"Enviar comprovante para análise"}</button>{error&&<p role="alert" className="ad-form-error">{error}</p>}</form>}<p>O envio não confirma o pagamento nem publica automaticamente. Os 3 dias começam após confirmação bancária e aprovação. Guarde o código do pedido.</p></section>;
}
