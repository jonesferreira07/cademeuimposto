import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMaranhaoPayroll, parsePiauiPayroll } from "../src/lib/state-payroll-official";
describe("Folhas estaduais conferidas na fonte primária", () => {
  it("soma os dois vínculos publicados do governador do MA, sem repetir a versão responsiva", () => {
    const html = readFileSync(new URL("./fixtures/maranhao-payroll.html", import.meta.url), "utf8");
    expect(parseMaranhaoPayroll(html, 2026, 9, "Carlos Orleans Brandão Junior")).toBe(41856.39);
    expect(parseMaranhaoPayroll(html, 2026, 9, "Carlos Brandão")).toBeNull();
    expect(() => parseMaranhaoPayroll(html, 2026, 10, "Carlos Orleans Brandão Junior")).toThrow("competência");
  });
  it("exige nome civil exato e único na folha do PI e não retém identificadores pessoais", () => {
    const payload = { count: 1, next: null, results: [{ ano: 2026, nome: "RAFAEL TAJRA FONTELES", remuneracao_bruta: "35574.64" }] };
    expect(parsePiauiPayroll(payload, 2026, "Rafael Tajra Fonteles")).toBe(35574.64);
    expect(parsePiauiPayroll(payload, 2026, "Rafael Fonteles")).toBeNull();
    expect(parsePiauiPayroll({ ...payload, count: 2 }, 2026, "Rafael Tajra Fonteles")).toBeNull();
    expect(parsePiauiPayroll(payload, 2025, "Rafael Tajra Fonteles")).toBeNull();
  });
});
