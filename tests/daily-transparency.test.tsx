import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {IdentifiedDailyCost} from "../src/components/parliament-costs";
import {composeIdentifiedCost} from "../src/lib/parliament-costs";
const component=(key:string,value:number|null,label=key)=>({key,value,label,source:"https://www.camara.leg.br/transparencia/",note:"Informação não individualizada.",coverageLabel:"Parcial · Competências confirmadas: 01/2026"});
function render(house:"camara"|"senado",components:ReturnType<typeof component>[]){
 const calculated=composeIdentifiedCost(components,31);
 const data={...calculated,period:{year:2026,month:null,months:[1],days:31,label:"Janeiro de 2026"}};
 const before=JSON.stringify(data);
 const html=renderToStaticMarkup(<IdentifiedDailyCost house={house} data={data}/>);
 expect(JSON.stringify(data)).toBe(before);
 return html;
}
describe("Transparência do custo público identificado",()=>{
 it("mantém aviso permanente fora de expansores e explicação acessível",()=>{
  const html=render("camara",[component("salary",310),component("staffExtra",null)]);
  expect(html).toContain("Quanto custa este parlamentar aos cofres públicos por dia?");
  expect(html).toContain("CUSTO IDENTIFICADO · VALOR PARCIAL");
  expect(html).toContain('aria-label="Aviso de transparência"');
  expect(html.indexOf("⚠️ ATENÇÃO:")).toBeLessThan(html.indexOf("Entenda o cálculo"));
  expect(html).toContain("Sobre este indicador parcial");expect(html).toContain("10,00");
  expect(html).toContain("31 dias corridos");expect(html).toContain("Competências confirmadas: 01/2026");
  expect(html).toContain("÷ Número de dias corridos do período");
 });
 it("diferencia a Câmara do Senado e não anuncia gabinete ou moradia como incluídos no Senado",()=>{
  const html=render("senado",[component("salary",310,"Salário"),component("quota",100,"CEAPS"),component("staff",null,"Assessores"),component("other",null,"Recursos anuais")]);
  const included=html.split("O que entra na conta nesta consulta")[1].split("Componentes sem informação suficiente")[0];
  expect(included).toContain("CEAPS: despesas reembolsadas");expect(included).not.toContain("Verba de gabinete efetivamente utilizada");expect(included).not.toContain("Auxílio-moradia comprovado");
  expect(html).toContain("Senado Federal");expect(html).toContain("lotação histórica");expect(html).toContain("Emendas parlamentares não são despesas pessoais");
 });
 it("não transforma falta de dados em zero e preserva zeros publicados e estornos",()=>{
  const empty=render("camara",[component("salary",null)]);
  expect(empty).toContain("Dados insuficientes");expect(empty).toContain("Nenhum componente tem informação suficiente");expect(empty).not.toContain("0,00 / dia");
  const html=render("camara",[component("salary",0),component("quota",-31)]);
  expect(html).toContain("-R$");expect(html).toContain("1,00 / dia");expect(html).toContain("este indicador não comprova cobertura");
 });
});
