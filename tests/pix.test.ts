import{describe,it,expect}from'vitest';
import{PIX_BASE_PAYLOAD,crc16,readPixFields,orderPix}from'../src/lib/advertising/pix';
import{adInputSchema}from'../src/lib/advertising/schema';
describe('Pix e formulário de anúncio',()=>{
 it('valida o código informado e preserva a chave com valor e referência do pedido',()=>{const fields=readPixFields(PIX_BASE_PAYLOAD);expect(crc16(PIX_BASE_PAYLOAD.slice(0,-4))).toBe(fields.get('63'));const pix=orderPix('00000000-0000-4000-8000-000000000001');const result=readPixFields(pix.code);expect(result.get('54')).toBe('9.90');expect(pix.key).toBe('jonesferreira7@icloud.com');expect(crc16(pix.code.slice(0,-4))).toBe(result.get('63'));expect(readPixFields(result.get('62')!).get('05')).toBe(pix.reference);});
 it('rejeita valores adulterados e links inseguros, sem transformar cupom em desconto',()=>{expect(()=>orderPix('00000000-0000-4000-8000-000000000001',200)).toThrow();const data={brand:'Marca de teste',phrase:'Exemplo para validar o formulário',website:'https://example.com',contact:'teste@example.com',coupon:'amigo1'};expect(adInputSchema.parse(data).coupon).toBe('AMIGO1');expect(adInputSchema.safeParse({...data,website:'javascript:alert(1)'}).success).toBe(false);expect(adInputSchema.safeParse({...data,companyWebsite:'bot'}).success).toBe(false);});
});
