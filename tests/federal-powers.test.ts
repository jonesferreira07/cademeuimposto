import{describe,it,expect}from'vitest';
import{parseFederalPowers}from'../src/lib/federal-powers';
import snapshot from'../src/data/federal-powers.json';
const raw=()=>({results:{bindings:snapshot.organizations.map(o=>({code:{value:o.code},name:{value:o.name},paid:{value:String(o.paid)},authorized:{value:String(o.authorized)},updated:{value:snapshot.updatedAt}}))}});
describe('SIOP: agrupamento por Poder sem confundir função, órgão e meta fiscal',()=>{
 it('preserva os 56 órgãos e a soma, separando MP e Defensoria',()=>{const r=parseFederalPowers(raw());expect(r.groups.find(g=>g.power==='legislative')?.paid).toBe(13448451231);expect(r.groups.find(g=>g.power==='judiciary')?.paid).toBe(53868453910);expect(r.groups.find(g=>g.power==='autonomous')?.paid).toBe(8878619321);expect(r.totalPaid).toBe(r.groups.reduce((s,g)=>s+g.paid,0));expect(r.forecast.value).toBe(-53048000000);});
 it('recusa órgãos ausentes, duplicados e datas divergentes',()=>{const missing=raw();missing.results.bindings.pop();expect(()=>parseFederalPowers(missing)).toThrow('incompleta');const duplicate=raw();duplicate.results.bindings[1]=duplicate.results.bindings[0];expect(()=>parseFederalPowers(duplicate)).toThrow();const dates=raw();dates.results.bindings[0].updated.value='2026-10-26T00:00:00-03:00';expect(()=>parseFederalPowers(dates)).toThrow();});
});
