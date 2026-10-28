import { describe,expect,it } from "vitest";
import { parseCotaComparative,comparativePerson } from "../src/lib/cota-comparative";
describe("Comparativo da Câmara inclui SIGEPA sem somar duas fontes sobrepostas",()=>{
 it("agrega rubricas com centavos e estornos, com vínculo exato por nome e UF",()=>{
  const csv="Nome;Partido;UF;Tipo_de_Despesa;Valor\nPedro Aihara;PP;MG;PASSAGEM AÉREA - SIGEPA;R$ 181,56\nPedro Aihara;PP;MG;SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO;R$ 87,99\nDandara;PT;MG;PASSAGEM AÉREA - SIGEPA;R$ -2.784,68\n";
  const rows=parseCotaComparative(csv);
  expect(comparativePerson(rows,"Pedro Aihara","MG")).toMatchObject({total:269.55,entries:2});
  expect(comparativePerson(rows,"Pedro","MG")).toBeNull();expect(comparativePerson(rows,"Pedro Aihara","SP")).toBeNull();
  expect(comparativePerson(rows,"Dandara","MG")?.total).toBe(-2784.68);
 });
 it("recusa CSV inválido em vez de publicar total parcial",()=>{expect(()=>parseCotaComparative('Nome;UF;Valor\nA;XX;1')).toThrow("incompatível");});
});
