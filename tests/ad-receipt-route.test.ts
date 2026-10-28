import {beforeEach,afterEach,it,expect,vi} from "vitest";
import {NextRequest} from "next/server";
vi.mock("../src/lib/advertising/mail",async original=>({...await original<typeof import("../src/lib/advertising/mail")>(),adEmailAvailable:()=>true,sendAdMail:vi.fn(async()=>({accepted:true}))}));
import {POST} from "../src/app/api/anuncios/comprovante/route";
import {sendAdMail} from "../src/lib/advertising/mail";
import {signReceiptToken} from "../src/lib/advertising/receipt-token";
const id="00000000-0000-4000-8000-000000000001",input={brand:"Marca",phrase:"Exemplo para testar o anexo",website:"https://example.com",contact:"teste@example.com",coupon:"INDICOU"};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AD_RECEIPT_SIGNING_KEY","test-signing-key".repeat(4));});
afterEach(()=>vi.unstubAllEnvs());
function request(token:string,bytes="%PDF-test",origin="http://localhost:3000"){
 const form=new FormData();form.set("token",token);form.set("file",new File([bytes],"recibo.pdf",{type:"application/pdf"}));
 return new NextRequest("http://localhost:3000/api/anuncios/comprovante",{method:"POST",headers:{host:"localhost:3000",origin,"x-forwarded-for":crypto.randomUUID()},body:form});
}
it("encaminha o comprovante vinculado ao pedido sem confirmar pagamento",async()=>{
 const response=await POST(request(signReceiptToken(id,input))),body=await response.json();
 expect(response.status).toBe(200);expect(body.accepted).toBe(true);expect(body.message).toContain("ainda será conferido");expect(sendAdMail).toHaveBeenCalledWith(expect.objectContaining({id,input}),expect.objectContaining({type:"application/pdf",filename:`comprovante-${id}.pdf`}));
});
it("recusa origem externa, referência adulterada e formato falso antes do envio",async()=>{
 expect((await POST(request(signReceiptToken(id,input),"%PDF-test","https://example.org"))).status).toBe(403);
 expect((await POST(request("invalid"))).status).toBe(400);
 expect((await POST(request(signReceiptToken(id,input),"not pdf"))).status).toBe(400);
 expect(sendAdMail).not.toHaveBeenCalled();
});
it("retorna falha se o provedor não aceitar o anexo",async()=>{
 vi.mocked(sendAdMail).mockRejectedValueOnce(new Error("Serviço indisponível"));
 const response=await POST(request(signReceiptToken(id,input)));expect(response.status).toBe(503);expect(await response.json()).not.toHaveProperty("accepted");
});
