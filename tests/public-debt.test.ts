import { describe, expect, it } from "vitest";
import { parseNationalDebt, parseStateDebt, rankStateDebt } from "../src/lib/public-debt";
import snapshot from "../src/data/public-debt.json";
const report=(overrides:Record<string,unknown>={})=>({hasMore:false,items:[{exercicio:2026,periodo:2,periodicidade:"Q",uf:"SP",cod_ibge:35,co_poder:"E",esfera:"E",anexo:"RGF-Anexo 02",rotulo:"Padrão",coluna:"Até o 2º Quadrimestre",cod_conta:"DividaConsolidada",valor:100,...overrides},{exercicio:2026,periodo:2,periodicidade:"Q",uf:"SP",cod_ibge:35,co_poder:"E",esfera:"E",anexo:"RGF-Anexo 02",rotulo:"Padrão",coluna:"Até o 2º Quadrimestre",cod_conta:"DividaConsolidadaLiquida",valor:-5}]});
describe("Dívida pública: medidas, unidades e cobertura",()=>{
 it("converte milhões do BC em reais e exige o mesmo mês nas duas séries",()=>{expect(parseNationalDebt([{data:"01/08/2026",valor:"11054954.37"}],[{data:"01/08/2026",valor:"82.87"}])).toMatchObject({gross:11054954370000,gdpPercent:82.87});expect(()=>parseNationalDebt([{data:"01/08/2026",valor:"1"}],[{data:"01/07/2026",valor:"1"}])).toThrow("mesmo mês");});
 it("preserva DCL negativa e recusa estado, período e conta duplicados",()=>{expect(parseStateDebt(report(),"SP",2)).toMatchObject({gross:100,net:-5});expect(()=>parseStateDebt(report({uf:"RJ"}),"SP",2)).toThrow();expect(()=>parseStateDebt(report(),"SP",1)).toThrow();const duplicate=report();duplicate.items.push(duplicate.items[0]);expect(()=>parseStateDebt(duplicate,"SP",2)).toThrow("duplicada");});
 it("só publica a comparação com as 27 UFs confirmadas",()=>{expect(rankStateDebt(snapshot.records)[0]).toMatchObject({uf:"SP",gross:390041766345.85});expect(()=>rankStateDebt(snapshot.records.slice(1))).toThrow("27 UFs");});
});
