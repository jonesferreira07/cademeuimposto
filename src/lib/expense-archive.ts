import { Unzip, UnzipInflate } from "fflate";
import { JSONParser } from "@streamparser/json";
import { z } from "zod";
import { expenseSchema, type Expense } from "./expenses";

const numeric = z.union([z.number().finite(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]);
const rowSchema = z.object({
  idDeputado: z.number().int().positive(), ano: z.number().int(), mes: z.number().int().min(1).max(12),
  idDocumento: z.number().int().nullish(), descricao: z.string(), fornecedor: z.string(),
  tipoDocumento: z.string(), numero: z.string(), dataEmissao: z.string().nullish(),
  valorDocumento: numeric, valorGlosa: numeric.nullish(), valorLiquido: numeric,
  urlDocumento: z.string().nullish(), ressarcimento: z.string().nullish(),
});
type Index = { records: Map<number, Expense[]>; source: string; publishedAt: string | null };
const cache = new Map<number, { expires: number; promise: Promise<Index> }>();

/** Parser em fluxo: não retém CPF, CNPJ, nomes de passageiros nem o JSON bruto de ~130 MB. */
export function createArchiveReader(year: number) {
  const records = new Map<number, Expense[]>();
  let finished = false, files = 0, count = 0, bytes = 0;
  let failure: Error | null = null;
  const unzip = new Unzip(file => {
    if (file.name !== `Ano-${year}.json`) return;
    files++;
    if (files > 1) throw new Error("Arquivo anual duplicado.");
    const parser = new JSONParser({ paths: ["$.dados.*"], keepStack: false });
    parser.onValue = ({ value }) => {
      if (!value || typeof value !== "object" || !("idDeputado" in value)) return; // Lideranças não são deputados.
      const row = rowSchema.parse(value);
      if (row.ano !== year) throw new Error("O arquivo contém despesas fora do exercício solicitado.");
      const item = expenseSchema.parse({ ano: row.ano, mes: row.mes, codDocumento: row.idDocumento, tipoDespesa: row.descricao, nomeFornecedor: row.fornecedor, tipoDocumento: "Documento publicado pela Câmara", dataDocumento: row.dataEmissao, numDocumento: row.numero, valorDocumento: row.valorDocumento, valorGlosa: row.valorGlosa, valorLiquido: row.valorLiquido, urlDocumento: row.urlDocumento, numRessarcimento: row.ressarcimento });
      const group = records.get(row.idDeputado) || []; group.push(item); records.set(row.idDeputado, group);
      count++; if (count > 500000) throw new Error("O arquivo excede o limite de registros permitido.");
    };
    file.ondata = (error, chunk, final) => {
      try {
        if (error) throw error;
        const firstChunk = bytes === 0;
        bytes += chunk.length;
        if (bytes > 350000000) throw new Error("O arquivo descompactado excede o limite permitido.");
        parser.write(firstChunk && chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf ? chunk.subarray(3) : chunk);
        if (final) { if (!parser.isEnded) parser.end(); finished = true; }
      } catch (error) { failure = error instanceof Error ? error : new Error("Arquivo inválido."); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  return {
    push(chunk: Uint8Array, final = false) { unzip.push(chunk, final); if (failure) throw failure; },
    result() { if (failure) throw failure; if (!finished || files !== 1) throw new Error("O arquivo anual está incompleto."); return records; },
  };
}

async function loadArchive(year: number): Promise<Index> {
  const source = `https://www.camara.leg.br/cotas/Ano-${year}.json.zip`;
  const response = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error("O arquivo anual da Câmara está indisponível.");
  const reader = response.body.getReader(); const parser = createArchiveReader(year); let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length; if (bytes > 30000000) throw new Error("Arquivo anual maior que o limite permitido.");
      parser.push(value);
    }
    parser.push(new Uint8Array(), true);
    return { records: parser.result(), source, publishedAt: response.headers.get("last-modified") ? new Date(response.headers.get("last-modified")!).toISOString() : null };
  } catch (error) { await reader.cancel(); throw error; }
}
export async function getArchiveExpenses(id: string, year: number, month?: number) {
  let entry = cache.get(year);
  if (!entry || entry.expires < Date.now()) {
    // Máximo de dois exercícios por processo; instâncias serverless podem reconstruir o índice.
    if (cache.size >= 2 && !cache.has(year)) cache.delete(cache.keys().next().value!);
    const promise = loadArchive(year).catch(error => { cache.delete(year); throw error; });
    entry = { expires: Date.now() + 3600000, promise }; cache.set(year, entry);
  }
  const archive = await entry.promise;
  return { records: (archive.records.get(Number(id)) || []).filter(item => month === undefined || item.mes === month), source: archive.source, publishedAt: archive.publishedAt };
}
