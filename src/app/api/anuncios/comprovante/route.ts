import { NextRequest,NextResponse } from "next/server";
import { verifyReceiptToken } from "@/lib/advertising/receipt-token";
import { adEmailAvailable,MAX_RECEIPT_BYTES,receiptAttachment,sendAdMail } from "@/lib/advertising/mail";
export const runtime="nodejs";
export const maxDuration=30;
const attempts=new Map<string,{expires:number;count:number}>();
export async function POST(request:NextRequest){
 const host=request.headers.get("host"),expected=host?`${request.nextUrl.protocol}//${host}`:request.nextUrl.origin;
 if(request.headers.get("origin")!==expected)return NextResponse.json({error:"Origem não autorizada."},{status:403});
 if(!adEmailAvailable())return NextResponse.json({error:"O envio de comprovantes ainda não está ativo."},{status:503});
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local",now=Date.now(),prior=attempts.get(ip);
 if(prior&&prior.expires>now&&prior.count>=5)return NextResponse.json({error:"Aguarde alguns minutos antes de reenviar."},{status:429});
 if(attempts.size>500)attempts.clear();attempts.set(ip,{expires:now+600000,count:prior&&prior.expires>now?prior.count+1:1});
 const limit=MAX_RECEIPT_BYTES+20000;
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data")||!request.body)return NextResponse.json({error:"Envie o arquivo pelo formulário de comprovante."},{status:400});
 if(Number(request.headers.get("content-length")||0)>limit)return NextResponse.json({error:"O comprovante precisa ter até 3 MB."},{status:413});
 try{
  const chunks:Uint8Array[]=[];let size=0;const reader=request.body.getReader();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return NextResponse.json({error:"O comprovante precisa ter até 3 MB."},{status:413});}chunks.push(value);}
  const data=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":request.headers.get("content-type")!}}).formData();
  let claims;try{claims=verifyReceiptToken(String(data.get("token")||""));}catch{return NextResponse.json({error:"Referência do pedido inválida ou expirada. Informe o código do pedido à equipe."},{status:400});}
  const file=data.get("file");if(!(file instanceof File))return NextResponse.json({error:"Selecione seu comprovante."},{status:400});
  let attachment;try{attachment=receiptAttachment(new Uint8Array(await file.arrayBuffer()),file.type,claims.id);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Arquivo inválido."},{status:400});}
  await sendAdMail({id:claims.id,input:claims.input,createdAt:new Date(claims.issuedAt).toISOString()},attachment);
  return NextResponse.json({accepted:true,message:"Comprovante encaminhado ao e-mail da equipe para análise. O pagamento ainda será conferido no banco."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível encaminhar o comprovante. Tente novamente ou entre em contato com a equipe informando o pedido."},{status:503});}
}
