import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
vi.mock("../src/lib/state-payroll-official", () => ({ officialGovernorPayments: vi.fn().mockResolvedValue([]) }));
import { stateRepresentatives } from "../src/lib/state-representatives";
import { parseOfficialRoster } from "../src/lib/state-rosters";
import { normalizePublicName } from "../src/lib/official-source";
import payroll from "../src/data/state-payroll.json";
import people from "../src/data/state-people.json";
afterEach(() => vi.useRealTimers());
describe("Folhas estaduais com período e procedência", () => {
  it("filtra setembro sem substituir o mês por acumulado ou salário legal", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
    const result = await stateRepresentatives("MA", "government", 2026, 9), governor = result.records[0];
    expect(governor.name).toContain("Brandão");
    expect(governor.paymentTotal).toBeNull(); expect(governor.paymentStatus).toBe("pending");
    expect(governor.availableMonths).toEqual([]);
    expect(governor.payments.every(row => row.year === 2026 && row.month === 9 && row.origin === "official")).toBe(true);
    const october = (await stateRepresentatives("MA", "government", 2026, 10)).records[0];
    expect(october.paymentTotal).toBeNull(); expect(october.payments).toEqual([]);
    expect(october.daily).toBeNull(); expect(october.completePeriod).toBe(false);
  });
  it("explicita a cobertura sem expor identificadores pessoais", async () => {
    const result = await stateRepresentatives(null, "government", 2026, 9);
    expect(result.records).toHaveLength(27);
    expect(result.coverage).toEqual({ states: 27, governorPayrollStates: 24, assemblyPayrollStates: 10 });
    expect(JSON.stringify(result.records)).not.toMatch(/cpf|matricula|matrícula/i);
    expect(result.records.filter(row => row.paymentTotal !== null).every(row => row.payments.every(payment => payment.origin === "official"))).toBe(true);
  });
  it("mantém créditos brutos em centavos e nomes exatos na base importada", () => {
    expect(payroll.records.every(row => row.year === 2026)).toBe(true);
    expect(payroll.records.every(row => Math.abs(row.amount * 100 - Math.round(row.amount * 100)) < 0.001)).toBe(true);
    expect(payroll.records.every(row => row.nameKey === normalizePublicName(row.name))).toBe(true);
    expect(new Set(people.people.map(person => person.uf)).size).toBe(27);
    expect(JSON.stringify(payroll)).not.toMatch(/cpf|cnpj|matrícula|matricula/i);
  });
  it("recusa UF inexistente", async () => { await expect(stateRepresentatives("XX", "government", 2026, 9)).rejects.toThrow("inválido"); });
});
describe("Listas estaduais oficiais", () => {
  const path = process.env.CMI_ROSTER_DIR;
  it.skipIf(!path)("confere os adaptadores contra as páginas oficiais completas", () => {
    for (const uf of ["MA", "CE", "AM", "BA", "DF", "ES", "MT", "PA", "PE", "SC", "SE", "TO", "MG", "SP"]) {
      const file = `${path}/cmi-roster-${uf}.${uf === "SP" ? "xml" : uf === "MG" ? "json" : "html"}`;
      expect(existsSync(file), uf).toBe(true);
      const roster = parseOfficialRoster(uf, readFileSync(file, "utf8"));
      expect(roster.length, uf).toBeGreaterThanOrEqual(5);
      expect(roster.every(row => row.name.length >= 3 && row.profile.startsWith("https://")), uf).toBe(true);
    }
  });
});
