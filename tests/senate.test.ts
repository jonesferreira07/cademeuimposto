import { afterEach, describe, expect, it, vi } from "vitest";
import { getSenators, parseSenators } from "../src/lib/senate";
import { statePortals } from "../src/lib/state-portals";
import { states } from "../src/lib/states";
import fixture from "./fixtures/senate.json";
afterEach(() => vi.unstubAllGlobals());
describe("Senadores em exercício e fontes estaduais", () => {
  it("interpreta a amostra oficial do PI e mantém apenas dados necessários", () => {
    const result = parseSenators(fixture);
    expect(result.senators).toHaveLength(3);
    expect(result.senators.map(row => row.name)).toContain("Ciro Nogueira");
    expect(result.senators.every(row => row.uf === "PI" && row.photo?.startsWith("https://www.senado.leg.br/") && row.profile.startsWith("https://www25.senado.leg.br/"))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/cpf|nascimento/i);
  });
  it("filtra a UF e rejeita duplicatas ou esquema incompatível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture))));
    expect((await getSenators("CE")).senators).toHaveLength(0);
    expect(() => parseSenators({})).toThrow("estrutura");
    const duplicate = structuredClone(fixture); duplicate.ListaParlamentarEmExercicio.Parlamentares.Parlamentar.push(duplicate.ListaParlamentarEmExercicio.Parlamentares.Parlamentar[0]);
    expect(() => parseSenators(duplicate)).toThrow("identificadores");
  });
  it("inclui governo e legislativo de todas as UFs sem nomes de titulares presumidos", () => {
    expect(Object.keys(statePortals)).toHaveLength(27);
    for (const state of states) {
      const entry = statePortals[state.uf];
      expect(new URL(entry.government).hostname).toMatch(/\.gov\.br$/);
      expect(new URL(entry.assembly).hostname).toMatch(/\.(leg|gov)\.br$/);
      expect(entry.government).toMatch(/^https:/); expect(entry.assembly).toMatch(/^https:/);
    }
    expect(statePortals.DF.assembly).toContain("cl.df.gov.br");
  });
});
