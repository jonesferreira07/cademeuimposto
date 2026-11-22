import{beforeEach,describe,expect,it,vi}from'vitest';
import{NextRequest}from'next/server';
import{readPixFields}from'../src/lib/advertising/pix';
vi.mock('../src/lib/advertising/store',()=>({createAdOrder:vi.fn(async(input)=>({...input,id:'00000000-0000-4000-8000-000000000009',status:'pending',createdAt:new Date().toISOString()}))}));
import{POST}from'../src/app/api/anuncios/pedidos/route';
import{createAdOrder}from'../src/lib/advertising/store';
beforeEach(()=>vi.clearAllMocks());
describe('Checkout Pix sem confirmação fictícia nem publicação automática',()=>{
 it('registra o cupom privado e fixa R$ 9,90 apesar de tentativa de adulteração do preço',async()=>{
  const request=new NextRequest('http://127.0.0.1:3000/api/anuncios/pedidos',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json','x-forwarded-for':'test-valid'},body:JSON.stringify({brand:'Marca teste',phrase:'Mensagem para testar o formulário',website:'https://example.com',contact:'teste@example.com',coupon:'amigo',priceCents:1})});
  const response=await POST(request),data=await response.json();expect(response.status).toBe(201);expect(data).toMatchObject({priceCents:990,durationDays:3,status:'pending'});expect(readPixFields(data.pix.copyPaste).get('54')).toBe('9.90');expect(data.pix.qrCode).toMatch(/^data:image\/png;base64,/);expect(data).not.toHaveProperty('contact');expect(vi.mocked(createAdOrder).mock.calls[0][0].coupon).toBe('AMIGO');
 });
 it('recusa origem externa antes de gravar pedido',async()=>{const response=await POST(new NextRequest('http://127.0.0.1:3000/api/anuncios/pedidos',{method:'POST',headers:{origin:'https://example.org'},body:'{}'}));expect(response.status).toBe(403);expect(createAdOrder).not.toHaveBeenCalled();});
});
