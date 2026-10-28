import { load } from "cheerio";
import { officialText } from "./official-source";
type Person = { name: string; party: string | null; profile: string; photo: string | null; officialId?: string };
const urls: Record<string, string> = {
  MA: "https://www.al.ma.leg.br/sitealema/deputados/", CE: "https://www.al.ce.gov.br/deputados", AM: "https://www.aleam.gov.br/deputados/", BA: "https://www.al.ba.gov.br/deputados/legislatura-atual", DF: "https://www.cl.df.gov.br/deputados-2023-2026", ES: "https://www.al.es.gov.br/Deputado/Lista", MT: "https://www.al.mt.gov.br/parlamento/deputados", PA: "https://www.alepa.pa.gov.br/Institucional/Deputados", PE: "https://www.alepe.pe.gov.br/parlamentares/", SC: "https://www.alesc.sc.gov.br/deputados/", SE: "https://aleselegis.al.se.leg.br/spl/parlamentares.aspx", TO: "https://www.al.to.leg.br/perfil", MG: "https://dadosabertos.almg.gov.br/ws/deputados/em_exercicio?formato=json", SP: "https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml",
};
const cache = new Map<string, { expires: number; promise: Promise<{ people: Person[]; source: string }> }>();
export function parseOfficialRoster(uf: string, raw: string, source = urls[uf]) {
  const people: Person[] = [];
  if (uf === "MG") {
    const rows = JSON.parse(raw).list;
    if (!Array.isArray(rows) || rows.length < 5 || rows.length > 150 || !rows.every(row => Number.isInteger(row.id) && typeof row.nome === "string")) throw new Error("Estrutura da ALMG incompatível.");
    return rows.map(row => ({ name: row.nome, party: row.partido || null, profile: `https://www.almg.gov.br/deputados/${row.id}/`, photo: null, officialId: String(row.id) }));
  }
  const $ = load(raw, uf === "SP" ? { xml: true } : {});
  const resolve = (value?: string) => { try { return value ? new URL(value.replaceAll("\\", "/"), source).toString().replace(/^http:/, "https:") : null; } catch { return null; } };
  const add = (name: string, party: string | null | undefined, href?: string, image?: string, officialId?: string) => {
    const clean = name.replace(/\s+/g, " ").trim(), profile = resolve(href);
    if (clean.length < 3 || clean.length > 100 || !profile) return;
    people.push({ name: clean, party: party?.replace(/\s+/g, " ").trim() || null, profile, photo: resolve(image), officialId });
  };
  if (uf === "SP") $("Deputado").each((_, el) => { const row = $(el); if (row.find("Situacao").text() !== "EXE") return; const id = row.find("Matricula").text(); add(row.find("NomeParlamentar").text(), row.find("Partido").text(), `https://www.al.sp.gov.br/deputado/?matricula=${id}`, undefined, id); });
  if (uf === "MA") $(".news-card").each((_, el) => { const row = $(el), link = row.find("h3 a"); if (link.attr("href")?.includes("/deputado/")) add(link.text(), row.find(".news-card-chapeu").text(), link.attr("href"), row.find("img").attr("src")); });
  if (uf === "CE") $(".deputado_card:not(.licenciado)").each((_, el) => { const row = $(el), link = row.find(".deputado_card--nome a"); add(link.text(), row.find(".deputado_card--partido").text(), link.attr("href"), row.find("img").attr("src")); });
  if (uf === "AM") $("a:has(.dep-int-cont__title)").each((_, el) => { const row = $(el); add(row.find(".dep-int-cont__title").text(), row.find(".dep-int-cont__part").text(), row.attr("href"), row.find("img").attr("src")); });
  if (uf === "BA") $(".deputado-nome a").each((_, el) => { const link = $(el), row = link.closest(".campo-dados").parent(); add(link.text(), row.find(".deputado-partido").text(), link.attr("href"), row.find("img").attr("src")); });
  if (uf === "DF") $("a.card:has(.card-title)").each((_, el) => { const row = $(el); add(row.find(".card-title").text(), row.find(".card-text").text(), row.attr("href"), row.find("img").attr("src")); });
  if (uf === "ES") $("[id='divListaDadosDeputado']").each((_, el) => { const row = $(el); add(row.find(".nomeDeputadoLista").text(), row.find("strong").first().text(), source, row.find("img").attr("src")); });
  if (uf === "MT") $(".card:has(a[href*='/parlamento/deputados/'])").each((_, el) => { const row = $(el); add(row.find(".card-title").text(), row.find(".badge").text(), row.find("a").attr("href"), row.find("img").attr("src")); });
  if (uf === "PA") $(".card-wrapper-deputado").each((_, el) => { const row = $(el); add(row.find(".card-info span").last().text(), row.find(".card-info p").text(), source, row.find("img").attr("src")); });
  if (uf === "PE") $(".parlamentares-list-a").each((_, el) => { const row = $(el); add(row.find("strong, h3, .parlamentar-nome, .nome").first().text() || row.find("figure").next().text(), row.find(".partido").text(), row.attr("href"), row.find("img").attr("src")); });
  if (uf === "SC") $("a[href*='/deputado/']:has(img)").each((_, el) => { const row = $(el); add(row.find("h3,h4,h5,.nome").first().text() || row.text().replace(/\b(?:PL|PP|PT|MDB|PSD|PSDB|UNIÃO|NOVO|PSOL|PODE|REPUBLICANOS)\b.*$/, ""), null, row.attr("href"), row.find("img").attr("src")); });
  if (uf === "SE") $(".kt-widget__media a:has(img)").each((_, el) => { const row = $(el); add(row.find("img").attr("alt") || "", null, row.attr("href"), row.find("img").attr("src")); });
  if (uf === "TO") $(".quadro-deputado").each((_, el) => { const row = $(el); add(row.find("h3").text(), row.find("h5").text(), row.find("a.btn-perfil").attr("href"), row.find("img").attr("src")); });
  const unique = [...new Map(people.map(row => [row.name.toLocaleUpperCase("pt-BR"), row])).values()];
  if (unique.length < 5 || unique.length > 150) throw new Error("A lista estadual não pôde ser validada.");
  return unique;
}
export async function officialStateRoster(uf: string) {
  const source = urls[uf]; if (!source) return null;
  const cached = cache.get(uf); if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = officialText(source, 3000000).then(raw => ({ people: parseOfficialRoster(uf, raw, source), source })).catch(error => { cache.delete(uf); throw error; });
  cache.set(uf, { expires: Date.now() + 3600000, promise }); return promise;
}
