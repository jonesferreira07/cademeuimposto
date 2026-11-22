import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { describe, expect, it, vi } from "vitest";
const recorded=vi.hoisted(()=>({connect:null as null|{ca:string;rejectUnauthorized:boolean},fetch:vi.fn(async(_url:string,_options:{dispatcher?:unknown})=>new Response("{}"))}));
vi.mock("undici",()=>({Agent:class {constructor(options:{connect:{ca:string;rejectUnauthorized:boolean}}){recorded.connect=options.connect;}},fetch:recorded.fetch}));
import { impostometroFetch } from "../src/lib/impostometro-fetch";
import { impostometroCA } from "../src/lib/impostometro-ca";
import { sectigoRSADomainValidationCA } from "../src/lib/impostometro-intermediate";
describe("HTTPS do Impostômetro com cadeia completa",()=>{
 it("preserva raízes do Node, certificados adicionais e validação TLS",()=>{expect(recorded.connect?.rejectUnauthorized).toBe(true);expect(recorded.connect?.ca).toContain(rootCertificates[0]);for(const pem of [impostometroCA,sectigoRSADomainValidationCA]){expect(recorded.connect?.ca).toContain(pem);expect(new X509Certificate(pem).ca).toBe(true);}});
 it("usa o agente seguro na requisição sem permitir troca pelo chamador",async()=>{const unsafe={};await impostometroFetch("https://impostometro.com.br/",{dispatcher:unsafe as never});expect(recorded.fetch).toHaveBeenCalledOnce();expect(recorded.fetch.mock.calls[0][1].dispatcher).not.toBe(unsafe);});
});
