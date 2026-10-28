import { z } from "zod";
import { getState } from "./states";
export const SENATE_SOURCE = "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json";
const senatorSchema = z.object({ IdentificacaoParlamentar: z.object({ CodigoParlamentar: z.string().regex(/^\d+$/), NomeParlamentar: z.string().min(1), NomeCompletoParlamentar: z.string().nullish(), SiglaPartidoParlamentar: z.string(), UfParlamentar: z.string(), UrlFotoParlamentar: z.string().nullish(), EmailParlamentar: z.string().nullish() }), Mandato: z.object({ DescricaoParticipacao: z.string().nullish() }).optional() });
export function parseSenators(raw: unknown) {
  const parsed = z.object({ ListaParlamentarEmExercicio: z.object({ Metadados: z.object({ Versao: z.string() }).optional(), Parlamentares: z.object({ Parlamentar: z.array(senatorSchema) }) }) }).safeParse(raw);
  if (!parsed.success) throw new Error("A estrutura da lista de senadores mudou na fonte.");
  const rows = parsed.data.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
  if (!rows.length || new Set(rows.map(row => row.IdentificacaoParlamentar.CodigoParlamentar)).size !== rows.length || rows.some(row => !getState(row.IdentificacaoParlamentar.UfParlamentar))) throw new Error("A lista do Senado contém identificadores incompatíveis.");
  return { source: SENATE_SOURCE, publishedAt: parsed.data.ListaParlamentarEmExercicio.Metadados?.Versao || null, senators: rows.map(row => {
    const person = row.IdentificacaoParlamentar;
    const photo = person.UrlFotoParlamentar?.replace(/^http:/, "https:");
    return { id: person.CodigoParlamentar, name: person.NomeParlamentar, civilName: person.NomeCompletoParlamentar || person.NomeParlamentar, party: person.SiglaPartidoParlamentar, uf: person.UfParlamentar, photo: photo?.startsWith("https://www.senado.leg.br/") ? photo : null, email: person.EmailParlamentar || null, participation: row.Mandato?.DescricaoParticipacao || null, profile: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${person.CodigoParlamentar}` };
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) };
}
export async function getSenators(uf?: string | null) {
  if (uf && !getState(uf)) throw new Error("Estado inválido.");
  let response;
  try { response = await fetch(SENATE_SOURCE, { headers: { Accept: "application/json" }, next: { revalidate: 1800 }, signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error("O Senado não respondeu à consulta. Tente novamente."); }
  if (!response.ok) throw new Error("A lista oficial de senadores está indisponível.");
  const result = parseSenators(await response.json());
  return { ...result, senators: uf ? result.senators.filter(row => row.uf === uf.toUpperCase()) : result.senators };
}
export type SenateResult = Awaited<ReturnType<typeof getSenators>>;
