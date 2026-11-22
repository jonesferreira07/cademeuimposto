import snapshot from "../data/global-tax-ranking.json";
export function getGlobalTaxRanking() {
  const countries = snapshot.countries.toSorted((a, b) => b.value - a.value || a.code.localeCompare(b.code));
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const records = countries.map(country => ({ ...country, name: country.code === "BRA" ? "Brasil" : country.alpha2 ? names.of(country.alpha2) || country.name : country.name, rank: 1 + countries.filter(other => other.value > country.value).length }));
  return { ...snapshot, countries: undefined, records, brazil: records.find(row => row.code === "BRA")!, coverage: records.length };
}
