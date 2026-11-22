import { describe, expect, it } from "vitest";
import { parseCounter } from "../src/lib/tax-counter-schema";

const now = Date.parse("2026-11-21T23:30:00-03:00");
const valid = {
  Valor: 1000000,
  Incremento: 2,
  Data: "2026-11-21T23:29:30",
  Midnight: "2026-11-21T00:00:00",
};

describe("Validação compartilhada da ACSP nas rotas Node e Edge", () => {
  it("usa o mesmo incremento e preserva a origem da amostra", () => {
    const sample = parseCounter(valid, "MA", now);
    const elapsed = (Date.parse("2026-11-21T23:29:30-03:00") - Date.parse("2026-11-21T00:00:00-03:00")) / 1000;
    expect(sample.value).toBe(1000000 + 2 * elapsed);
    expect(sample.increment).toBe(2);
    expect(sample.source).toBe("https://impostometro.com.br");
    expect(sample.uf).toBe("MA");
    expect(sample.year).toBe(2026);
  });
  it("rejeita amostra antiga e data futura excessiva", () => {
    expect(() => parseCounter(valid, null, now + 301000)).toThrow("recente");
    expect(() => parseCounter(valid, null, now - 91000)).toThrow("recente");
  });
  it("não apresenta números falsos ou um esquema desconhecido", () => {
    expect(() => parseCounter({ ...valid, Valor: -1 }, null, now)).toThrow("formato");
    expect(() => parseCounter({ ...valid, Data: "ontem" }, null, now)).toThrow("Data");
    expect(() => parseCounter({}, null, now)).toThrow("formato");
  });
});
