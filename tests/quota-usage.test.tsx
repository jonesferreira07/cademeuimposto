import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {QuotaUsage} from "../src/components/quota-usage";
describe("Barra da cota com limites explícitos",()=>{
 it("mostra gasto, referência e 60% sem denominar saldo disponível",()=>{
  const html=renderToStaticMarkup(<QuotaUsage spent={300000} reference={500000} percent={60} period="Acumulado em 2026" monthly={false}/>);
  expect(html).toContain('value="60"');expect(html).toContain("300.000,00");expect(html).toContain("500.000,00");expect(html).toContain("60% da referência utilizada");expect(html).toContain("Não é saldo oficial");
 });
 it("preserva percentual acima de 100 e não transforma falta ou estorno em gasto zero",()=>{
  const render=(spent:number|null,percent:number|null)=>renderToStaticMarkup(<QuotaUsage spent={spent} reference={100} percent={percent} period="09/2026" monthly/>);
  expect(render(120,120)).toContain('aria-valuetext="120% da referência utilizada"');expect(render(120,120)).toContain('value="100"');expect(render(null,null)).toContain("Dados insuficientes");expect(render(null,null)).not.toContain("<progress");expect(render(-10,-10)).toContain("estornos");expect(render(-10,-10)).not.toContain("<progress");
 });
});
