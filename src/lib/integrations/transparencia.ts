import "server-only";

export const TRANSPARENCIA_API = "https://api.portaldatransparencia.gov.br/api-de-dados";
export const TRANSPARENCIA_DOCS = "https://portaldatransparencia.gov.br/api-de-dados";

/** Base para futuras consultas. Nenhum dado financeiro é exposto nesta versão. */
export function getTransparencyStatus() {
  return { configured: Boolean(process.env.PORTAL_TRANSPARENCIA_API_KEY), enabled: false, source: TRANSPARENCIA_DOCS };
}
