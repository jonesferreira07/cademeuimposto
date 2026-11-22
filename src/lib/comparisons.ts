export const comparisonReferences = [
  { id: "car", label: "Fiat Mobi Like", unitValue: 85490, description: "Preço de entrada anunciado pela Fiat, sem opcionais. Referência consultada em 27/10/2026; não é oferta de compra.", source: "https://mobi.fiat.com.br/", reference: "Fiat · 27/10/2026" },
  { id: "home", label: "moradias de 50 m² em custo de referência", unitValue: 1999.73 * 50, description: "50 m² × R$ 1.999,73/m², custo médio nacional SINAPI/IBGE de setembro de 2026. Ilustração: não inclui terreno, projetos, infraestrutura e demais custos de um imóvel pronto.", source: "https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/202609/variaveis/48?localidades=N1%5Ball%5D", reference: "IBGE/SINAPI · set/2026" },
  { id: "salary", label: "salários mínimos mensais de 2026", unitValue: 1621, description: "Salário mínimo nacional de R$ 1.621,00 em vigor desde 01/01/2026, Decreto 12.797/2025. Não inclui encargos trabalhistas.", source: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm", reference: "Decreto 12.797/2025" },
] as const;
export function equivalentUnits(total: number, unitValue: number) {
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(unitValue) || unitValue <= 0) throw new Error("Valores inválidos para a comparação.");
  return Math.floor(total / unitValue);
}
