import{afterEach,describe,expect,it,vi}from'vitest';
import{mkdtemp,readFile,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';import path from'node:path';
import{createAdOrder,activeAdvertisement,orderDirectory}from'../src/lib/advertising/store';
import{sendAdMail}from'../src/lib/advertising/mail';
vi.mock('../src/lib/advertising/mail',()=>({adEmailAvailable:()=>!!process.env.AD_RECEIPT_SIGNING_KEY,sendAdMail:vi.fn(async()=>({accepted:true}))}));
let directory:string|undefined;
afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllEnvs();if(directory)await rm(directory,{recursive:true,force:true});directory=undefined;});
describe('Anúncios: registro privado, indicação e exibição somente após confirmação e aprovação',()=>{
 it('não publica pedido pendente, preserva cupom e não expõe contato no anúncio público',async()=>{
  directory=await mkdtemp(path.join(tmpdir(),'cmi-ad-test-'));vi.spyOn(process,'cwd').mockReturnValue(directory);vi.stubEnv('VERCEL','');
  const order=await createAdOrder({brand:'Marca de teste',phrase:'Oferta para testar o pedido',website:'https://example.com',contact:'teste@example.com',coupon:'INDICACAO1'});
  expect(order).toMatchObject({priceCents:990,durationDays:3,status:'pending',paymentConfirmedAt:null,startsAt:null});expect(await activeAdvertisement()).toBeNull();
  const stored=JSON.parse(await readFile(path.join(orderDirectory(),`${order.id}.json`),'utf8'));expect(stored.coupon).toBe('INDICACAO1');
  const start='2026-10-28T12:00:00Z',end='2026-10-31T12:00:00Z';await writeFile(path.join(orderDirectory(),`${order.id}.json`),JSON.stringify({...order,paymentConfirmedAt:start,approvedAt:start,startsAt:start,expiresAt:end,status:'active'}));
  const active=await activeAdvertisement(new Date('2026-10-29T12:00:00Z'));expect(active?.brand).toBe(order.brand);expect(active).not.toHaveProperty('contact');expect(active).not.toHaveProperty('coupon');expect(await activeAdvertisement(new Date(end))).toBeNull();
 });
 it('exige referência assinada para gerar Pix em produção',async()=>{vi.stubEnv('VERCEL','1');vi.stubEnv('AD_RECEIPT_SIGNING_KEY','');await expect(createAdOrder({brand:'Marca',phrase:'Teste de anúncio',website:'https://example.com',contact:'teste@example.com',coupon:''})).rejects.toThrow('indisponível');});
 it('gera pedido antes do pagamento e reserva o e-mail para o envio do comprovante',async()=>{vi.stubEnv('VERCEL','1');vi.stubEnv('AD_RECEIPT_SIGNING_KEY','x'.repeat(64));vi.stubEnv('RESEND_API_KEY','');const input={brand:'Marca',phrase:'Teste de anúncio',website:'https://example.com',contact:'teste@example.com',coupon:'AMIGO'};const order=await createAdOrder(input);expect(order).toMatchObject({status:'pending',priceCents:990,coupon:'AMIGO'});expect(sendAdMail).not.toHaveBeenCalled();});
});
