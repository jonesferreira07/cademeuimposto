export function formatCnpj(cnpj: string) {
  return /^\d{14}$/.test(cnpj) ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "Não informado";
}
