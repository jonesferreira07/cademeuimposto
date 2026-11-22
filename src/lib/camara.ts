import { z } from "zod";
import { getState } from "./states";

export const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";
export const CAMARA_SOURCE = "https://dadosabertos.camara.leg.br/swagger/api.html";
const deputySchema = z.object({
  id: z.number().int().positive(), nome: z.string(), siglaPartido: z.string(),
  siglaUf: z.string().refine(value => !!getState(value)), urlFoto: z.string().nullish(), email: z.string().nullish(),
});
export type Deputy = z.infer<typeof deputySchema>;
const detailSchema = z.object({
  id: z.number().int().positive(), nomeCivil: z.string(),
  dataNascimento: z.string().nullish(), municipioNascimento: z.string().nullish(),
  ufNascimento: z.string().nullish(), escolaridade: z.string().nullish(),
  ultimoStatus: z.object({
    nome: z.string(), siglaPartido: z.string(), siglaUf: z.string().refine(value => !!getState(value)),
    urlFoto: z.string().nullish(), email: z.string().nullish(),
    situacao: z.string().nullish(), condicaoEleitoral: z.string().nullish(),
    gabinete: z.object({ nome: z.string().nullish(), predio: z.string().nullish(),
      sala: z.string().nullish(), andar: z.string().nullish(),
      telefone: z.string().nullish(), email: z.string().nullish() }).nullish(),
  }),
});
export type DeputyDetail = z.infer<typeof detailSchema>;
export class CamaraError extends Error {
  constructor(message: string, public status = 502) { super(message); this.name = "CamaraError"; }
}
async function request(path: string) {
  let response: Response;
  try {
    response = await fetch(`${CAMARA_API}${path}`, {
      headers: { Accept: "application/json" }, next: { revalidate: 1800 },
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new CamaraError("A Câmara não respondeu a tempo. Tente novamente em alguns instantes."); }
  if (!response.ok) throw new CamaraError("Não foi possível consultar os dados oficiais da Câmara.", response.status === 404 ? 404 : 502);
  try { return await response.json(); }
  catch { throw new CamaraError("A Câmara retornou uma resposta que não pôde ser lida."); }
}
export function validateFilters(input: { uf?: string; q?: string; page?: string }) {
  const uf = input.uf?.toUpperCase() || undefined;
  if (uf && !getState(uf)) throw new CamaraError("Unidade federativa inválida.", 400);
  const q = (input.q || "").trim();
  if (q.length > 100) throw new CamaraError("A pesquisa deve ter até 100 caracteres.", 400);
  const page = input.page === undefined ? 1 : Number(input.page);
  if (!Number.isInteger(page) || page < 1 || page > 100) throw new CamaraError("Página inválida.", 400);
  return { uf, q, page };
}
export async function getDeputies(input: { uf?: string; q?: string; page?: string } = {}) {
  const filters = validateFilters(input);
  const params = new URLSearchParams({ itens: "100", ordem: "ASC", ordenarPor: "nome", pagina: String(filters.page) });
  if (filters.uf) params.set("siglaUf", filters.uf);
  if (filters.q) params.set("nome", filters.q);
  const result = z.object({ dados: z.array(deputySchema), links: z.array(z.object({ rel: z.string(), href: z.string() })) }).safeParse(await request(`/deputados?${params}`));
  if (!result.success) throw new CamaraError("O formato dos dados oficiais mudou. Tente novamente mais tarde.");
  if (new Set(result.data.dados.map(row => row.id)).size !== result.data.dados.length || filters.uf && result.data.dados.some(row => row.siglaUf !== filters.uf)) throw new CamaraError("A lista retornada não corresponde à UF solicitada ou contém identificadores duplicados.");
  return { deputies: result.data.dados, hasNext: result.data.links.some((link) => link.rel === "next"), page: filters.page, source: `${CAMARA_API}/deputados?${params}` };
}
export async function getDeputy(id: string) {
  if (!/^[1-9]\d{0,8}$/.test(id)) throw new CamaraError("Parlamentar não encontrado.", 404);
  const result = z.object({ dados: detailSchema }).safeParse(await request(`/deputados/${id}`));
  if (!result.success) throw new CamaraError("O formato do perfil oficial mudou. Tente novamente mais tarde.");
  if (result.data.dados.id !== Number(id)) throw new CamaraError("O perfil retornado não corresponde ao parlamentar solicitado.");
  return result.data.dados;
}
