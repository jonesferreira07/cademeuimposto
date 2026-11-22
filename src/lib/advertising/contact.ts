import type { AdInput } from "./schema";
export const AD_CONTACT_EMAIL = "jonesferreira07@gmail.com";
export function manualAdEmail(input: AdInput, id?: string, reference?: string) {
  const subject = `Anúncio de R$9,90 por 3 dias${id ? ` · ${id}` : ""}`;
  const body = `${id ? `Pedido: ${id}\nIdentificador Pix: ${reference || ""}\n` : ""}Marca: ${input.brand}\nFrase: ${input.phrase}\nSite: ${input.website}\nContato: ${input.contact}\nCupom: ${input.coupon || "Não informado"}\nValor: R$9,90\nExibição: 3 dias após confirmação bancária e aprovação.\n\nAnexarei o comprovante a este e-mail para conferência. O envio não confirma o pagamento.`;
  return `mailto:${AD_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
