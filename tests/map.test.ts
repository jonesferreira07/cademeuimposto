import { describe, expect, it } from "vitest";
import paths from "../src/lib/brazil-paths.json";
import { getState, states } from "../src/lib/states";
describe("Cobertura geográfica do mapa", () => {
  it("possui uma geometria para cada uma das 27 UFs, sem duplicatas", () => {
    expect(paths).toHaveLength(27);
    expect(new Set(paths.map(p => p.code)).size).toBe(27);
    expect(paths.map(p => p.code).sort()).toEqual(states.map(s => s.code).sort());
  });
  it("inclui o Distrito Federal e resolve siglas sem diferenciar maiúsculas", () => {
    expect(getState("df")?.name).toBe("Distrito Federal");
    expect(getState("ce")?.name).toBe("Ceará");
    expect(getState("XX")).toBeUndefined();
  });
});
