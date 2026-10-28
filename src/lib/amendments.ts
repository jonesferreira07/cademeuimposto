import { Unzip, UnzipInflate } from "fflate";
import { parse } from "csv-parse";
import authors from "../data/amendment-authors.json";

export const AMENDMENT_SOURCE = "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares";
export const AMENDMENT_ARCHIVE = "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip";
const normal = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
const key = (value: string) => normal(value).replaceAll(" ", "_");
type Row = Record<string, string>;
export function parsePublicMoney(value: string) {
  if (!/^-?\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(value)) throw new Error("Valor monetário incompatível no arquivo da CGU.");
  const numeric = Number(value.replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(numeric)) throw new Error("Valor monetário inválido na CGU.");
  return Math.round(numeric * 100) / 100;
}
export type Amendment = { code: string; authorCode: string; authorName: string; year: number; type: string; destination: string; municipality: string; uf: string; function: string; subfunction: string; program: string; action: string; plan: string; committed: number; liquidated: number; paid: number; remainingPaid: number; remainingRegistered: number; remainingCancelled: number };
export type Beneficiary = { code: string; name: string; legalName: string | null; cnpj: string | null; recipientType: string; municipality: string; uf: string; period: string; amount: number; nature: string };
export type Agreement = { code: string; number: string; published: string; institution: string; purpose: string; value: number };
type Index = { amendments: Amendment[]; beneficiaries: Map<string, Beneficiary[]>; agreements: Map<string, Agreement[]>; publishedAt: string | null };

// O campo também contém CPFs mascarados. Tipo e dígitos verificadores são obrigatórios.
export function beneficiaryCompany(row: Record<string, string>) {
  const recipientType = row.tipo_favorecido || "Não informado";
  if (normal(recipientType) !== "pessoa juridica") return { cnpj: null, legalName: null, recipientType };
  const raw = (row.codigo_do_favorecido || "").trim();
  const cnpj = raw.replace(/[.\/\-]/g, "");
  const valid = /^\d{14}$/.test(cnpj) && !/^(\d)\1{13}$/.test(cnpj) && [12, 13].every(length => {
    const sum = cnpj.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * ((length - index - 1) % 8 + 2), 0);
    const remainder = sum % 11; return Number(cnpj[length]) === (remainder < 2 ? 0 : 11 - remainder);
  });
  return { cnpj: valid ? cnpj : null, legalName: row.favorecido || null, recipientType };
}
export function unliquidatedAmount(committed: number | null, liquidated: number | null) {
  if (committed === null || liquidated === null) return null;
  const difference = Math.round(committed * 100) - Math.round(liquidated * 100);
  // Divergência da fonte não é convertida em saldo fictício ou escondida como zero.
  return difference < 0 ? null : difference / 100;
}
export function createAmendmentReader(year: number) {
  const amendments: Amendment[] = [], beneficiaries = new Map<string, Beneficiary[]>(), agreements = new Map<string, Agreement[]>();
  let failure: Error | null = null, bytes = 0; const finished: Promise<void>[] = []; const files = new Set<string>(), completed = new Set<string>();
  const put = <T,>(map: Map<string, T[]>, code: string, value: T) => { const values = map.get(code) || []; values.push(value); map.set(code, values); };
  const unzip = new Unzip(file => {
    if (!["EmendasParlamentares.csv", "EmendasParlamentares_PorFavorecido.csv", "EmendasParlamentares_Convenios.csv"].includes(file.name)) return;
    if (files.has(file.name)) throw new Error("Arquivo duplicado na base CGU."); files.add(file.name);
    const decoder = new TextDecoder("windows-1252");
    const parser = parse({ delimiter: ";", columns: (columns: string[]) => columns.map(key), skip_empty_lines: true, bom: true });
    finished.push(new Promise(resolve => {
      parser.on("error", error => { failure = error; resolve(); }); parser.on("end", resolve);
      parser.on("data", (row: Row) => {
        if (failure) return;
        try {
          const code = row.codigo_da_emenda;
          if (!code || !/^\d{12}$/.test(code) || Number(code.slice(0, 4)) !== year) return;
          if (file.name === "EmendasParlamentares.csv") {
            if (!normal(row.tipo_de_emenda || "").startsWith("emenda individual")) return;
            const authorCode = row.codigo_do_autor_da_emenda;
            if (!/^\d{4}$/.test(authorCode) || code.slice(4, 8) !== authorCode || Number(row.ano_da_emenda) !== year || !row.nome_do_autor_da_emenda) throw new Error("Identificador de autoria inconsistente na CGU.");
            amendments.push({ code, year, authorCode, authorName: row.nome_do_autor_da_emenda, type: row.tipo_de_emenda, destination: row.localidade_de_aplicacao_do_recurso, municipality: row.municipio, uf: row.uf, function: row.nome_funcao, subfunction: row.nome_subfuncao, program: row.nome_programa, action: row.nome_acao, plan: row.nome_plano_orcamentario, committed: parsePublicMoney(row.valor_empenhado), liquidated: parsePublicMoney(row.valor_liquidado), paid: parsePublicMoney(row.valor_pago), remainingPaid: parsePublicMoney(row.valor_restos_a_pagar_pagos), remainingRegistered: parsePublicMoney(row.valor_restos_a_pagar_inscritos), remainingCancelled: parsePublicMoney(row.valor_restos_a_pagar_cancelados) });
          } else if (file.name === "EmendasParlamentares_PorFavorecido.csv") {
            put(beneficiaries, code, { code, name: row.favorecido, ...beneficiaryCompany(row), municipality: row.municipio_favorecido, uf: row.uf_favorecido, period: row.ano_mes, amount: parsePublicMoney(row.valor_recebido), nature: row.natureza_juridica });
          } else {
            put(agreements, code, { code, number: row.numero_convenio, published: row.data_publicacao_convenio, institution: row.convenente, purpose: row.objeto_convenio, value: parsePublicMoney(row.valor_convenio) });
          }
        } catch (error) { failure = error instanceof Error ? error : new Error("Dados incompatíveis na CGU."); }
      });
    }));
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) { failure = error; parser.end(); return; }
      bytes += chunk.length;
      if (bytes > 450000000) { failure = new Error("A base CGU excedeu o tamanho seguro. Nenhum total parcial foi publicado."); parser.end(); return; }
      parser.write(decoder.decode(chunk, { stream: !final }));
      if (final) { completed.add(file.name); parser.end(); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  return {
    push(chunk: Uint8Array, final = false) { unzip.push(chunk, final); if (failure) throw failure; },
    async result() { if (failure) throw failure; if (files.size !== 3 || completed.size !== 3) throw new Error("A base CGU está incompleta."); await Promise.all(finished); if (failure) throw failure; return { amendments, beneficiaries, agreements }; },
  };
}
const cache = new Map<number, { expires: number; value: Promise<Index> }>();
async function loadIndex(year: number): Promise<Index> {
  const response = await fetch(AMENDMENT_ARCHIVE, { cache: "no-store", signal: AbortSignal.timeout(45000) });
  if (!response.ok || !response.body) throw new Error("Os dados de emendas estão indisponíveis na CGU.");
  const reader = response.body.getReader(), parser = createAmendmentReader(year); let bytes = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 65000000) throw new Error("A base de emendas excedeu o limite de download."); parser.push(value); }
    parser.push(new Uint8Array(), true);
    return { ...await parser.result(), publishedAt: response.headers.get("last-modified") || null };
  } catch (error) { await reader.cancel(); throw error; }
}
export function amendmentTotals(records: Amendment[]) {
  const sum = (field: "committed" | "liquidated" | "paid" | "remainingPaid") => records.length ? records.reduce((total, item) => total + Math.round(item[field] * 100), 0) / 100 : null;
  return { committed: sum("committed"), liquidated: sum("liquidated"), awaitingLiquidation: unliquidatedAmount(sum("committed"), sum("liquidated")), paid: sum("paid"), remainingPaid: sum("remainingPaid") };
}
export async function getAmendments(id: string, year: number) {
  const identity = (authors.links as Record<string, { authorCode: string; authorName: string; deputyName: string; uf: string }>)[id];
  const empty = { records: [] as Amendment[], beneficiaries: {} as Record<string, Beneficiary[]>, agreements: {} as Record<string, Agreement[]>, totals: amendmentTotals([]), source: AMENDMENT_SOURCE, year, authorSource: authors.source, publishedAt: null as string | null };
  if (!identity) return { ...empty, verified: false, identity: null, message: "A autoria deste parlamentar ainda não foi vinculada com segurança. Consulte o nome no Portal da Transparência; nenhum valor foi atribuído automaticamente." };
  let entry = cache.get(year);
  if (!entry || entry.expires < Date.now()) {
    cache.clear(); const value = loadIndex(year).catch(error => { cache.delete(year); throw error; }); entry = { expires: Date.now() + 3600000, value }; cache.set(year, entry);
  }
  const data = await entry.value;
  const records = data.amendments.filter(row => row.authorCode === identity.authorCode);
  if (records.some(row => normal(row.authorName) !== normal(identity.authorName))) return { ...empty, verified: false, identity: null, message: "A identificação do autor divergiu entre as fontes. Confirme a autoria diretamente na CGU antes de atribuir valores." };
  const codes = new Set(records.map(row => row.code));
  return { ...empty, verified: true, identity, message: records.length ? null : "Nenhum registro identificado na CGU para esse autor e ano; isso não comprova ausência de emendas.", records: records.toSorted((a, b) => b.paid - a.paid || a.code.localeCompare(b.code)), totals: amendmentTotals(records), beneficiaries: Object.fromEntries([...data.beneficiaries].filter(([code]) => codes.has(code))), agreements: Object.fromEntries([...data.agreements].filter(([code]) => codes.has(code))), publishedAt: data.publishedAt };
}
export type AmendmentResult = Awaited<ReturnType<typeof getAmendments>>;
