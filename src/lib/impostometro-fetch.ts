import { Agent, fetch as undiciFetch } from "undici";
import { rootCertificates } from "node:tls";
import { impostometroCA } from "./impostometro-ca";

// A autoridade adicional é usada somente nas requisições ao Impostômetro.
// A verificação do certificado e do nome do servidor permanece ativada.
const dispatcher = new Agent({
  connect: {
    ca: [...rootCertificates, impostometroCA].join("\n"),
    rejectUnauthorized: true,
  },
});

export function impostometroFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1] = {},
) {
  return undiciFetch(url, { ...init, dispatcher });
}
