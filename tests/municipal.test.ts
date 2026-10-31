import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import municipalIndex from "../src/data/municipal-index.json";
import { states } from "../src/lib/states";
import { municipalSelection, municipalViewBox, municipalHash, normalizeMunicipalSearch, type MunicipalDataset } from "../src/lib/municipal";

const data = states.filter(state => state.uf !== "DF").map(state => JSON.parse(readFileSync(new URL(`../public/data/municipal/${state.uf.toLowerCase()}.json`, import.meta.url), "utf8")) as MunicipalDataset);
const manifest = JSON.parse(readFileSync(new URL("../public/data/municipal/manifest.json", import.meta.url), "utf8"));
const allCities = data.flatMap(dataset => dataset.cities);
function city(uf: string, id: string) { return data.find(dataset => dataset.uf === uf)!.cities.find(item => item.id === id)!; }

describe("Navegação municipal", () => {
  it("valida o vínculo UF/IBGE no endereço e impede vazamento da seleção entre estados", () => {
    expect(municipalSelection("#uf=ma&municipio=2111300")).toEqual({ uf: "MA", city: "2111300" });
    expect(municipalSelection("#uf=ce&municipio=2111300")).toEqual({ uf: "CE", city: null });
    expect(municipalSelection("#uf=xx&municipio=2111300")).toEqual({ uf: null, city: null });
    expect(municipalSelection("#uf=df&municipio=5300108")).toEqual({ uf: "DF", city: null });
    expect(municipalSelection("#uf=ma&municipio=21<script>").city).toBeNull();
    expect(municipalHash("MA", "2111300")).toBe("/#uf=ma&municipio=2111300");
    expect(municipalHash("CE", "2111300")).toBe("/#uf=ce");
    expect(municipalHash(null)).toBe("/");
  });
  it("enquadra os polígonos sem cortar municípios e aproveita o formato horizontal do RN", () => {
    for (const dataset of data) {
      const [left,top,width,height] = municipalViewBox(dataset.cities);
      expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
      for (const city of dataset.cities) if (city.shape) {
        const [x,y,w,h] = city.shape.bounds;
        expect(x).toBeGreaterThanOrEqual(left); expect(y).toBeGreaterThanOrEqual(top);
        expect(x+w).toBeLessThanOrEqual(left+width); expect(y+h).toBeLessThanOrEqual(top+height);
      }
    }
    const rn = municipalViewBox(data.find(dataset => dataset.uf === "RN")!.cities);
    expect(rn[2]/rn[3]).toBeGreaterThan(1.5);
    expect(municipalViewBox([])).toEqual([0,0,600,550]);
  });
  it("pesquisa cidades e pessoas sem exigir acentos", () => {
    expect(normalizeMunicipalSearch("  São LUÍS ")).toBe("sao luis");
  });
});

describe("Fotografia oficial municipal de 30/10/2026", () => {
  it("cobre todos os estados e os 5.569 municípios, sem transformar DF/Noronha em prefeituras", () => {
    expect(data).toHaveLength(26);
    expect(municipalIndex.map(item => item.id).sort()).toEqual(allCities.filter(item => item.kind === "municipality").map(item => item.id).sort());
    expect(new Set(allCities.map(item => item.id)).size).toBe(5570);
    expect(allCities.filter(item => item.kind === "municipality")).toHaveLength(5569);
    expect(allCities.filter(item => item.kind === "district").map(item => item.id)).toEqual(["2605459"]);
    expect(allCities.some(item => item.id === "5300108")).toBe(false);
    const district = city("PE", "2605459");
    expect(district.mayor).toBeNull(); expect(district.council).toBeNull();
    expect(allCities.filter(item => item.kind === "municipality" && !item.tseCode)).toHaveLength(0);
  });
  it("mantém códigos TSE e IBGE separados e geometrias finitas em suas próprias UFs", () => {
    const invalid: string[] = [];
    for (const dataset of data) {
      const state = states.find(item => item.uf === dataset.uf)!;
      if (dataset.asOf !== manifest.asOf) invalid.push(dataset.uf + ":date");
      for (const item of dataset.cities) {
        if (!item.id.startsWith(state.code) || !/^\d{7}$/.test(item.id)) invalid.push(item.id);
        if (item.tseCode && !/^\d{5}$/.test(item.tseCode)) invalid.push(item.id + ":tse");
        if (item.shape && (!/^[MLZ\d.,-]+$/.test(item.shape.d) || item.shape.bounds.some(value => !Number.isFinite(value) || value < 0) || item.shape.bounds[0] + item.shape.bounds[2] > 600.1 || item.shape.bounds[1] + item.shape.bounds[3] > 550.1)) invalid.push(item.id + ":shape");
      }
    }
    expect(invalid).toEqual([]);
    expect(city("MA", "2111300").tseCode).toBe("09210");
    expect(allCities.filter(item => !item.shape).map(item => item.id)).toEqual([]);
    expect(city("MT", "5101837").shape?.d).toMatch(/^M/);
  });
  it("publica somente situações oficiais de eleito, sem suplentes, NÃO ELEITO ou duplicatas", () => {
    const problems: string[] = [];
    for (const item of allCities) for (const [role, election] of [["mayor", item.mayor], ["council", item.council]] as const) {
      if (!election) continue;
      if (election.date > "2026-10-30" || ![1, 2].includes(election.turn)) problems.push(item.id + ":date");
      if (role === "mayor" && election.people.length > 1) problems.push(item.id + ":mayors");
      if (new Set(election.people.map(person => person.id)).size !== election.people.length) problems.push(item.id + ":duplicates");
      for (const person of election.people) if (!["ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA"].includes(person.status) || !person.name || !person.ballotName || !person.party) problems.push(item.id + ":status");
    }
    expect(problems).toEqual([]);
    expect(city("MA", "2111300").mayor?.people[0].ballotName).toBe("EDUARDO BRAIDE");
    expect(city("SP", "3550308").mayor?.date).toBe("2024-10-27");
    expect(city("SP", "3550308").mayor?.people.map(person => person.ballotName)).toEqual(["RICARDO NUNES"]);
    expect(city("CE", "2304400").mayor?.people.map(person => person.ballotName)).toEqual(["EVANDRO LEITÃO"]);
  });
  it("usa a eleição suplementar mais recente e mantém a eleição ordinária do cargo não renovado", () => {
    const oiapoque = city("AP", "1600501");
    expect(oiapoque.mayor?.supplementary).toBe(true);
    expect(oiapoque.mayor?.date).toBe("2026-04-12");
    expect(oiapoque.mayor?.people.map(person => person.ballotName)).toEqual(["INACIO"]);
    expect(oiapoque.council?.date).toBe("2024-10-06");
    expect(oiapoque.council?.people).toHaveLength(11);
  });
  it("expõe resultados não confirmados, sem recuperar eleito de eleição anterior", () => {
    expect(allCities.filter(item => item.kind === "municipality" && !item.mayor?.people.length)).toHaveLength(17);
    expect(allCities.filter(item => item.kind === "municipality" && !item.council?.people.length)).toHaveLength(21);
    const narandiba = allCities.find(item => item.name === "Narandiba")!;
    expect(narandiba.mayor?.date).toBe("2026-10-25");
    expect(narandiba.mayor?.people).toEqual([]);
    expect(manifest.states.reduce((sum: number, row: { unconfirmedMayor: number }) => sum + row.unconfirmedMayor, 0)).toBe(17);
  });
  it("não exporta CPF, título, nascimento ou contato dos candidatos", () => {
    const actualKeys = new Set(allCities.flatMap(item => [item.mayor, item.council].flatMap(election => election?.people.flatMap(person => Object.keys(person)) || [])));
    expect([...actualKeys].sort()).toEqual(["ballotName", "id", "name", "party", "status"]);
    expect(manifest.aliases).toHaveLength(13);
    expect(manifest.tseZipSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
