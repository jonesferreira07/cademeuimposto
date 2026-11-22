import QRCode from "qrcode";
import { AD_DURATION_DAYS, AD_PRICE_CENTS, type AdInput } from "./schema";
import { orderPix } from "./pix";
import { receiptSigningReady, signReceiptToken } from "./receipt-token";

export async function adCheckout(id: string, input: AdInput, issuedAt: number) {
  const pix = orderPix(id);
  return {
    id, input, status: "pending", createdAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(issuedAt + 7 * 86400000).toISOString(),
    priceCents: AD_PRICE_CENTS, durationDays: AD_DURATION_DAYS,
    receiptToken: receiptSigningReady() ? signReceiptToken(id, input, issuedAt) : null,
    pix: { copyPaste: pix.code, reference: pix.reference, key: pix.key, qrCode: await QRCode.toDataURL(pix.code, { errorCorrectionLevel: "M", margin: 2, width: 280 }) },
    message: "Após pagar, envie os dados e o comprovante à equipe. Os 3 dias começam após confirmação no banco e aprovação. Gerar o Pix não confirma pagamento nem publica o anúncio.",
  };
}
export type AdCheckout = Awaited<ReturnType<typeof adCheckout>>;
