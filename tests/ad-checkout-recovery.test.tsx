import {beforeEach,afterEach,it,expect,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {NextRequest} from "next/server";
import {POST} from "../src/app/api/anuncios/retomar/route";
import {adCheckout} from "../src/lib/advertising/checkout";
import {pendingAdToken,savePendingAd} from "../src/lib/advertising/pending";
import {manualAdEmail} from "../src/lib/advertising/contact";
import {readPixFields} from "../src/lib/advertising/pix";
import {AdSlot} from "../src/components/ad-slot";
const id="00000000-0000-4000-8000-000000000001",input={brand:"Marca teste",phrase:"Pedido para testar retorno do banco",website:"https://example.com",contact:"teste@example.com",coupon:"AMIGO"};
beforeEach(()=>{vi.stubEnv("AD_RECEIPT_SIGNING_KEY","test-signing-key".repeat(4));});
afterEach(()=>vi.unstubAllEnvs());
function request(body:unknown,origin="http://localhost:3000"){
 return new NextRequest("http://localhost:3000/api/anuncios/retomar",{method:"POST",headers:{host:"localhost:3000",origin,"content-type":"application/json"},body:JSON.stringify(body)});
}
it("restaura o pedido e o Pix no servidor sem prolongar a validade ou aceitar preço adulterado",async()=>{
 const order=await adCheckout(id,input,Date.now()-5000);
 const response=await POST(request({token:order.receiptToken,priceCents:1,pix:"fake",input:{brand:"adulterada"}})),restored=await response.json();
 expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");
 expect(restored).toMatchObject({id,input,priceCents:990,expiresAt:order.expiresAt,receiptToken:order.receiptToken});
 expect(readPixFields(restored.pix.copyPaste).get("54")).toBe("9.90");expect(restored.pix.copyPaste).toBe(order.pix.copyPaste);
});
it("recusa pedidos de outra origem e tokens adulterados",async()=>{
 expect((await POST(request({token:"invalid"},"https://example.org"))).status).toBe(403);
 expect((await POST(request({token:"invalid"}))).status).toBe(400);
});
it("guarda só a referência privada, remove referência expirada e tolera armazenamento bloqueado",()=>{
 const entries=new Map<string,string>(),storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);},removeItem:(key:string)=>{entries.delete(key);}};
 savePendingAd(storage,"abc.signature",new Date(10000).toISOString());expect(pendingAdToken(storage,9000)).toBe("abc.signature");expect(pendingAdToken(storage,11000)).toBeNull();expect(entries.size).toBe(0);
 expect(pendingAdToken({...storage,getItem:()=>{throw new Error("blocked");}})).toBeNull();
});
it("mantém revisão habilitada e inclui todos os dados no e-mail manual posterior ao Pix",()=>{
 const html=renderToStaticMarkup(<AdSlot/>),button=html.match(/<button[^>]*>Revisar e gerar o Pix/);
 expect(button).not.toBeNull();expect(button![0]).not.toContain("disabled");
 const url=new URL(manualAdEmail(input,id,"CMI0001"));expect(url.protocol).toBe("mailto:");expect(url.pathname).toBe("jonesferreira07@gmail.com");
 const body=url.searchParams.get("body")!;for(const part of [id,"CMI0001",input.brand,input.phrase,input.website,input.contact,"AMIGO","R$9,90"])expect(body).toContain(part);
});
