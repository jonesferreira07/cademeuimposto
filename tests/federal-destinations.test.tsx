import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import snapshot from "../src/data/federal-destinations.json";
import {parseFederalDestinations} from "../src/lib/federal-destinations";
import {FederalDestinationsContent} from "../src/components/federal-destinations";
const clone=()=>JSON.parse(JSON.stringify(snapshot));
describe("Destino dos gastos federais com conciliação e escopo",()=>{
 it("concilia as 29 funções com o total independente sem perder centavos",()=>{
  const r=parseFederalDestinations(snapshot.raw,snapshot.control);
  expect(r.records).toHaveLength(29);expect(r.totalPaid).toBe(5000332122694.07);
  expect(r.records.reduce((s,x)=>s+Math.round(x.paid*100),0)).toBe(Math.round(r.totalPaid*100));
  expect(r.records.reduce((s,x)=>s+x.percent,0)).toBeCloseTo(100,9);
  expect(r.records.find(x=>x.code==="99")?.paid).toBe(0);
  expect(r.records.find(x=>x.code==="10")!.paid).toBeGreaterThan(0);
 });
 it("recusa funções ausentes, duplicações, datas e totais divergentes",()=>{
  const missing=clone();missing.raw.results.bindings.pop();expect(()=>parseFederalDestinations(missing.raw,missing.control)).toThrow("incompletas");
  const duplicate=clone();duplicate.raw.results.bindings[0]=duplicate.raw.results.bindings[1];expect(()=>parseFederalDestinations(duplicate.raw,duplicate.control)).toThrow();
  const dates=clone();dates.control.results.bindings[0].updated.value="2026-10-29T01:00:00-03:00";expect(()=>parseFederalDestinations(dates.raw,dates.control)).toThrow("datas");
  const value=clone();value.raw.results.bindings[0].paidCents.value=String(Number(value.raw.results.bindings[0].paidCents.value)+1);expect(()=>parseFederalDestinations(value.raw,value.control)).toThrow("soma");
 });
 it("separa refinanciamento sem alterar total e percentuais por função",()=>{
  const full=parseFederalDestinations(snapshot.raw,snapshot.control,snapshot.refinancingRaw),original=parseFederalDestinations(snapshot.raw,snapshot.control);
  expect(full.refinancing?.paid).toBe(1500619344449.81);
  expect(Math.round(full.refinancing!.paid*100)+Math.round(full.refinancing!.remainingPaid*100)).toBe(Math.round(full.totalPaid*100));
  expect(full.records).toEqual(original.records);expect(original.refinancing).toBeNull();
  const bad=clone();bad.refinancingRaw.results.bindings[0].updated.value="2026-10-29T00:00:00-03:00";
  expect(()=>parseFederalDestinations(bad.raw,bad.control,bad.refinancingRaw)).toThrow("Refinanciamento");
  const duplicate=clone();duplicate.refinancingRaw.results.bindings[1]=duplicate.refinancingRaw.results.bindings[0];expect(()=>parseFederalDestinations(duplicate.raw,duplicate.control,duplicate.refinancingRaw)).toThrow();
  const excessive=clone();excessive.refinancingRaw.results.bindings[0].paidCents.value="600000000000000";expect(()=>parseFederalDestinations(excessive.raw,excessive.control,excessive.refinancingRaw)).toThrow();
 });
 it("explica a diferença sem apresentar o restante como serviço ou déficit",()=>{
  const data={...parseFederalDestinations(snapshot.raw,snapshot.control,snapshot.refinancingRaw),origin:"verified-snapshot" as const,fetchedAt:"2026-10-30T12:00:00Z"};
  const html=renderToStaticMarkup(<FederalDestinationsContent data={data}/>);
  for(const text of ["Pagamentos federais · inclui dívida","Subtrair esses dois números não calcula o déficit","Demais pagamentos federais","Não equivalem apenas a serviços públicos","incluindo o refinanciamento","1.500.619.344.449,81"])expect(html).toContain(text);
 });
 it("não atribui percentuais do gasto federal ao contador de impostos e identifica cópia datada",()=>{
  const data={...parseFederalDestinations(snapshot.raw,snapshot.control),origin:"verified-snapshot" as const,fetchedAt:"2026-10-30T12:00:00Z"};
  const html=renderToStaticMarkup(<FederalDestinationsContent data={data}/>);
  for(const text of ["Saúde","Educação","Previdência Social","Assistência Social","Cópia oficial datada","30/10/2026","não altera este acumulado federal","Não dividimos o valor do Impostômetro","nem cobre todo o gasto de estados e municípios"])expect(html).toContain(text);
  expect(html).toContain("Ver todas as outras áreas (25)");
 });
});
