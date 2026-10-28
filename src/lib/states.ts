export const states = [
  { uf: "AC", name: "Acre", code: "12", region: "Norte" },
  { uf: "AL", name: "Alagoas", code: "27", region: "Nordeste" },
  { uf: "AP", name: "Amapá", code: "16", region: "Norte" },
  { uf: "AM", name: "Amazonas", code: "13", region: "Norte" },
  { uf: "BA", name: "Bahia", code: "29", region: "Nordeste" },
  { uf: "CE", name: "Ceará", code: "23", region: "Nordeste" },
  { uf: "DF", name: "Distrito Federal", code: "53", region: "Centro-Oeste" },
  { uf: "ES", name: "Espírito Santo", code: "32", region: "Sudeste" },
  { uf: "GO", name: "Goiás", code: "52", region: "Centro-Oeste" },
  { uf: "MA", name: "Maranhão", code: "21", region: "Nordeste" },
  { uf: "MT", name: "Mato Grosso", code: "51", region: "Centro-Oeste" },
  { uf: "MS", name: "Mato Grosso do Sul", code: "50", region: "Centro-Oeste" },
  { uf: "MG", name: "Minas Gerais", code: "31", region: "Sudeste" },
  { uf: "PA", name: "Pará", code: "15", region: "Norte" },
  { uf: "PB", name: "Paraíba", code: "25", region: "Nordeste" },
  { uf: "PR", name: "Paraná", code: "41", region: "Sul" },
  { uf: "PE", name: "Pernambuco", code: "26", region: "Nordeste" },
  { uf: "PI", name: "Piauí", code: "22", region: "Nordeste" },
  { uf: "RJ", name: "Rio de Janeiro", code: "33", region: "Sudeste" },
  { uf: "RN", name: "Rio Grande do Norte", code: "24", region: "Nordeste" },
  { uf: "RS", name: "Rio Grande do Sul", code: "43", region: "Sul" },
  { uf: "RO", name: "Rondônia", code: "11", region: "Norte" },
  { uf: "RR", name: "Roraima", code: "14", region: "Norte" },
  { uf: "SC", name: "Santa Catarina", code: "42", region: "Sul" },
  { uf: "SP", name: "São Paulo", code: "35", region: "Sudeste" },
  { uf: "SE", name: "Sergipe", code: "28", region: "Nordeste" },
  { uf: "TO", name: "Tocantins", code: "17", region: "Norte" },
] as const;
export function getState(uf: string) { return states.find((state) => state.uf === uf.toUpperCase()); }
export function taxLocation(uf?: string | null) {
  const state = uf ? getState(uf) : undefined;
  if (!state) return "no Brasil";
  const preposition = ["RO", "MG", "AL", "SE", "RR", "SP", "PE"].includes(state.uf) ? "em" : ["BA", "PB"].includes(state.uf) ? "na" : "no";
  return `${preposition} ${state.name}`;
}
