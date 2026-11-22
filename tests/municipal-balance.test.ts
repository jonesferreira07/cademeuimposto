import { describe, expect, it } from "vitest";
import { balanceAppearance } from "../src/lib/municipal-balance";
describe("Cores da comparação municipal", () => {
  it("usa verde para pago menor ou igual à receita e vermelho para pago maior", () => {
    expect(balanceAppearance(500,300)).toMatchObject({ tone: "green", difference: 200, percent: -40 });
    expect(balanceAppearance(500,500)).toMatchObject({ tone: "green", difference: 0, percent: 0 });
    expect(balanceAppearance(500,500.01)).toMatchObject({ tone: "red", difference: -.01 });
  });
  it("compara em centavos, sem tornar arredondamento binário uma despesa maior", () => {
    expect(balanceAppearance(.3,.1+.2).tone).toBe("green");
  });
  it("preserva zero publicado sem dividir por zero", () => {
    expect(balanceAppearance(0,0)).toMatchObject({ tone: "green", difference: 0, percent: null });
    expect(balanceAppearance(0,10)).toMatchObject({ tone: "red", color: "#b51f39", percent: null });
  });
  it("não classifica ausência, números inválidos, negativos ou fora de precisão como economia", () => {
    for (const [revenue,paid] of [[null,0],[0,null],[undefined,1],[100,NaN],[Infinity,10],[-1,10],[10,-1],[1e20,1]] as const) expect(balanceAppearance(revenue,paid)).toMatchObject({ tone: "neutral", difference: null, percent: null });
  });
  it("gradua a intensidade proporcional e satura a partir de 50%", () => {
    expect(balanceAppearance(100,90).color).not.toBe(balanceAppearance(100,60).color);
    expect(balanceAppearance(100,110).color).not.toBe(balanceAppearance(100,140).color);
    expect(balanceAppearance(100,150).color).toBe(balanceAppearance(100,1000).color);
    expect(balanceAppearance(100,50).color).toBe(balanceAppearance(100,0).color);
    expect(balanceAppearance(100,100).color).toBe("#83d8ad");
  });
});
