import { NextRequest,NextResponse } from "next/server";
import { adInputSchema } from "@/lib/advertising/schema";
import { createAdOrder } from "@/lib/advertising/store";
import { adCheckout } from "@/lib/advertising/checkout";
export const runtime="nodejs";
export const maxDuration=30;
const attempts=new Map<string,{count:number;expires:number}>();
export async function POST(request:NextRequest){
 // NextURL normaliza 127.0.0.1 para localhost. Preserve o Host recebido no teste de origem.
 const origin=request.headers.get("origin"),host=request.headers.get("host"),expectedOrigin=host?`${request.nextUrl.protocol}//${host}`:request.nextUrl.origin;
 if(origin!==expectedOrigin)return NextResponse.json({error:"Origem do pedido não autorizada."},{status:403});
 if(Number(request.headers.get("content-length")||0)>4096)return NextResponse.json({error:"Pedido muito grande."},{status:413});
 const client=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"local";const now=Date.now(),previous=attempts.get(client);if(previous&&previous.expires>now&&previous.count>=5)return NextResponse.json({error:"Aguarde alguns minutos antes de criar outro pedido."},{status:429});
 if(attempts.size>500)attempts.clear();attempts.set(client,{count:previous&&previous.expires>now?previous.count+1:1,expires:now+600000});
 try{
  const body=await request.text();if(body.length>4096)return NextResponse.json({error:"Pedido muito grande."},{status:413});
  const parsed=adInputSchema.safeParse(JSON.parse(body));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Confira os campos."},{status:400});
  const order=await createAdOrder(parsed.data);
  return NextResponse.json(await adCheckout(order.id,parsed.data,Date.parse(order.createdAt)),{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof SyntaxError?"Pedido inválido.":error instanceof Error&&"code" in error?"Não foi possível salvar o pedido. Nenhum Pix foi gerado.":error instanceof Error?error.message:"Não foi possível registrar o pedido."},{status:error instanceof SyntaxError?400:503});}
}
