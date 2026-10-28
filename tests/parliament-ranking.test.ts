import { describe, expect, it } from "vitest";
import { rankPublishedQuota } from "../src/lib/parliament-ranking";
const person=(id:string,name:string,spent:number|null,documents=1)=>({ id,name,spent,documents,uf:"CE",party:"",photo:null,profile:"https://www.camara.leg.br" });
describe("Ranking de despesas publicadas, sem falsos campeões de economia",()=>{
 it("ordena em centavos, preserva empates e separa ausência e estornos",()=>{
  const result=rankPublishedQuota([person("1","B",10.01),person("2","A",10.01),person("3","C",100.11),person("4","D",null,0),person("5","E",-100),person("6","F",0,0)]);
  expect(result.records.map(row=>[row.name,row.rank])).toEqual([["A",1],["B",1],["C",3]]);
  expect(result.top).toHaveLength(3); expect(result.withoutRecords).toBe(2);expect(result.netRefunds).toBe(1);expect(result.excluded).toBe(3);
 });
 it("não transforma lista vazia ou IDs duplicados em classificação",()=>{
  expect(rankPublishedQuota([])).toMatchObject({records:[],top:[]});
  expect(()=>rankPublishedQuota([person("1","A",10),person("1","B",20)])).toThrow("repetidos");
 });
});
