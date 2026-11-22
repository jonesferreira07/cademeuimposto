import interest from "../data/real-interest-ranking.json";
import purchasing from "../data/purchasing-power.json";
export function economicRanking(metric: string) {
  if (metric === "interest") return { kind: "interest", title: "Juros reais projetados", period: "16/09/2026", publisher: interest.publisher, source: interest.source, document: interest.document, note: interest.metric, verifiedAt: interest.verifiedAt, records: interest.records, brazil: interest.records.find(row => row.name === "Brasil")!, coverage: interest.records.length };
  if (metric !== "purchasing") throw new Error("Indicador inválido.");
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const records = purchasing.records.map(row => ({ ...row, name: names.of(row.alpha2) || row.name }));
  return { kind: "purchasing", title: "Consumo por pessoa · PPC", period: String(purchasing.year), publisher: "Banco Mundial · WDI / ICP", source: purchasing.source, document: purchasing.dataSource, note: purchasing.metric, verifiedAt: purchasing.verifiedAt, records, brazil: records.find(row => row.code === "BRA")!, coverage: records.length };
}
export type EconomicRanking = ReturnType<typeof economicRanking>;
