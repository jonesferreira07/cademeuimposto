import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MunicipalPanel } from "../src/components/municipal-panel";
import type { MunicipalDataset } from "../src/lib/municipal";
const data = JSON.parse(readFileSync(new URL("../public/data/municipal/ma.json", import.meta.url), "utf8")) as MunicipalDataset;
const saoLuis = data.cities.find(item => item.id === "2111300")!;
function render(city = saoLuis, dataset = data) {
  return renderToStaticMarkup(<MunicipalPanel city={city} dataset={dataset} loading={false} error={null} retry={() => {}} />);
}
describe("Transparência dos representantes municipais", () => {
  it("mostra prefeito e vereadores com a distinção entre resultado eleitoral e exercício atual", () => {
    const html = render();
    expect(html).toContain("EDUARDO BRAIDE");
    expect(html).toContain("Câmara Municipal");
    expect(html).toContain("não uma confirmação de exercício atual");
    expect(html).toContain("Partido informado na eleição");
    expect(html).toContain("06/10/2024");
    expect(html).toContain("TSE · candidaturas e resultados oficiais");
    expect(html).toContain("não estão integrados");
  });
  it("não confunde cargo sem resultado confirmado com vacância ou gasto zero", () => {
    const html = render({ ...saoLuis, mayor: { ...saoLuis.mayor!, people: [] }, council: null });
    expect(html).toContain("não permite confirmar um resultado de eleito para prefeito");
    expect(html).toContain("não permite confirmar um resultado de eleito para vereadores");
    expect(html).toContain("Isso não significa cargo vago");
    expect(html).not.toContain("R$");
    expect(html).not.toContain("EDUARDO BRAIDE");
  });
  it("não atribui prefeito ou vereadores a Fernando de Noronha", () => {
    const html = render({ ...saoLuis, id: "2605459", name: "Fernando de Noronha", kind: "district", mayor: null, council: null });
    expect(html).toContain("Não elege prefeito nem vereadores");
    expect(html).not.toContain("prefeito(a) eleito(a)");
  });
});
