import peopleData from "../data/state-people.json";
import payrollData from "../data/state-payroll.json";
import { getState } from "./states";
import { normalizePublicName, selectionWindow } from "./official-source";
import { officialStateRoster } from "./state-rosters";
import { officialGovernorPayments } from "./state-payroll-official";

type StateRole = "assembly" | "government";
type SeedPerson = { id: string; name: string; civilName: string; uf: string; role: StateRole; party: string | null; profile: string | null; origin: string; aliases?: string[]; photo: string | null; photoCredit: { author: string | null; license: string | null; source: string | null } | null };
export type StatePerson = SeedPerson & { payments: { year: number; month: number; amount: number; source: string | null; dataFile: string; label: string; name: string; origin: string }[]; paymentTotal: number | null; completePeriod: boolean; availableMonths: number[]; latestPeriod: string | null; daily: number | null; daysWithData: number; paymentStatus: "verified" | "pending" | "missing" };
const seed = peopleData.people as SeedPerson[];
export async function stateRepresentatives(uf: string | null, role: StateRole, year: number, month?: number) {
  if (uf && !getState(uf)) throw new Error("Estado inválido.");
  const period = selectionWindow(year, month);
  let people = seed.filter(person => person.role === role && (!uf || person.uf === uf));
  let directRosterSource: string | null = null;
  if (uf && role === "assembly") {
    const direct = await officialStateRoster(uf).catch(() => null);
    if (direct) {
      directRosterSource = direct.source;
      people = direct.people.map(person => {
        const matching = people.filter(old => person.officialId && old.id.endsWith(`-${person.officialId}`) || normalizePublicName(old.name) === normalizePublicName(person.name));
        const previous = matching.length === 1 ? matching[0] : null;
        return { id: previous?.id || `official-${uf}-${normalizePublicName(person.name).replaceAll(" ", "-")}`, name: person.name, civilName: previous?.civilName || person.name, uf, role, party: person.party || previous?.party || null, profile: person.profile, origin: "official", photo: person.photo || previous?.photo || null, photoCredit: person.photo ? { author: "Assembleia Legislativa", license: "Fotografia divulgada no perfil institucional", source: direct.source } : previous?.photoCredit || null };
      });
    }
  }
  const records: StatePerson[] = [];
  for (const person of people) {
    const aliases = new Set([person.name, person.civilName, ...(person.aliases || [])].map(normalizePublicName));
    const ambiguous = seed.some(other => other.id !== person.id && other.uf === person.uf && other.role === person.role && [other.name, other.civilName].some(name => aliases.has(normalizePublicName(name))));
    const all = ambiguous ? [] : payrollData.records.filter(row => row.uf === person.uf && row.role === role && aliases.has(row.nameKey));
    let payments = all.filter(row => row.year === year && period.months.includes(row.month)).map(row => ({ year: row.year, month: row.month, amount: row.amount, source: row.source, dataFile: row.dataFile, label: row.label, name: row.name, origin: "consolidated" }));
    if (uf && role === "government" && ["MA", "PI"].includes(uf)) {
      const direct = await officialGovernorPayments(uf, year, period.months, aliases);
      if (direct.length) payments = direct;
    }
    // Consolidação externa serve à conferência, mas não certifica pagamento na fonte primária.
    const pending = payments.some(row => row.origin !== "official");
    payments = payments.filter(row => row.origin === "official");
    const paymentStatus = payments.length ? "verified" as const : pending ? "pending" as const : "missing" as const;
    const availableMonths = [...new Set(payments.map(row => row.month))].sort((a, b) => a - b);
    const paymentTotal = payments.length ? payments.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100 : null;
    const daysWithData = availableMonths.reduce((sum, m) => sum + selectionWindow(year, m).days, 0);
    const latest = all.toSorted((a, b) => b.year - a.year || b.month - a.month)[0];
    records.push({ ...person, payments, paymentStatus, paymentTotal, completePeriod: availableMonths.length === period.months.length && period.months.length > 0, availableMonths, latestPeriod: latest ? `${String(latest.month).padStart(2, "0")}/${latest.year}` : null, daily: paymentTotal === null || !daysWithData ? null : Math.round(paymentTotal / daysWithData * 100) / 100, daysWithData });
  }
  const sources = uf ? (peopleData.sources as Record<string, unknown>)[uf] : null;
  return { records: records.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), period, sources, directRosterSource, meta: peopleData.meta, coverage: { states: 27, governorPayrollStates: new Set(payrollData.records.filter(row => row.role === "government").map(row => row.uf)).size, assemblyPayrollStates: new Set(payrollData.records.filter(row => row.role === "assembly").map(row => row.uf)).size }, note: "Somente valores conferidos diretamente na fonte oficial são publicados. Folhas importadas ainda em conferência não são exibidas como pagamentos confirmados. Pagamentos individuais, sem substituir mês ausente pelo acumulado anual. Créditos brutos não são o líquido recebido; podem incluir auxílios e verbas eventuais. Subsídios previstos em lei não são usados como pagamentos presumidos." };
}
export type StateRepresentationResult = Awaited<ReturnType<typeof stateRepresentatives>>;
